-- Logistical Dumpster: initial schema
-- All timestamps stored as timestamptz (UTC). The client and edge functions
-- format to Eastern Time (America/New_York) for display.

set search_path = public;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type user_role       as enum ('provider', 'proxy', 'secondary_proxy');
create type classification  as enum ('essential', 'extra', 'discretionary');
create type claim_status    as enum (
  'submitted',
  'receipt_pending_grace',
  'receipt_overdue',
  'under_review',
  'approved',
  'denied',
  'correction_requested',
  'appealed',
  'appeal_resolved',
  'escalated'
);
create type enforcement_level as enum ('none', 'warning', 'deductible', 'suspended');
create type notification_channel as enum ('sms', 'email');
create type notification_event as enum (
  'claim_submitted',
  'receipt_missing',
  'receipt_reminder_day2',
  'receipt_overdue_day3',
  'approved',
  'denied',
  'correction_requested',
  'appeal_submitted',
  'appeal_resolved',
  'enforcement_escalated'
);

-- ---------------------------------------------------------------------------
-- PROFILES (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          user_role not null,
  display_name  text not null,
  email         text,
  phone_e164    text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_idx on profiles (role) where active;

-- ---------------------------------------------------------------------------
-- CLAIMS
-- ---------------------------------------------------------------------------
create table claims (
  id                 uuid primary key default gen_random_uuid(),
  submitter_id       uuid not null references profiles (id),
  vendor             text not null,
  purchase_date      date not null,
  amount_cents       integer not null check (amount_cents >= 0),
  classification     classification not null,
  agreement_section  text,
  notes              text,
  status             claim_status not null default 'submitted',
  enforcement_level  enforcement_level not null default 'none',
  receipt_deadline   timestamptz,       -- set when grace period starts
  submitted_at       timestamptz not null default now(),
  reviewed_at        timestamptz,
  reviewer_id        uuid references profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index claims_submitter_idx on claims (submitter_id);
create index claims_status_idx on claims (status);
create index claims_deadline_idx on claims (receipt_deadline) where receipt_deadline is not null;

-- ---------------------------------------------------------------------------
-- RECEIPTS (files in Storage bucket `receipts/`)
-- ---------------------------------------------------------------------------
create table receipts (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid not null references claims (id) on delete cascade,
  storage_path text not null,     -- e.g. receipts/<claim_id>/<filename>
  mime_type   text,
  byte_size   integer,
  uploaded_by uuid not null references profiles (id),
  uploaded_at timestamptz not null default now()
);

create index receipts_claim_idx on receipts (claim_id);

-- ---------------------------------------------------------------------------
-- EOB (Explanation of Benefits)
-- One per claim; produced at approve/deny.
-- ---------------------------------------------------------------------------
create table eob_statements (
  claim_id                uuid primary key references claims (id) on delete cascade,
  billed_cents            integer not null,
  allowed_cents           integer not null,
  provider_resp_cents     integer not null,
  proxy_resp_cents        integer not null,
  beneficiary_impact_note text,
  generated_at            timestamptz not null default now(),
  generated_by            uuid not null references profiles (id)
);

-- ---------------------------------------------------------------------------
-- APPEALS (one per claim)
-- ---------------------------------------------------------------------------
create table appeals (
  id             uuid primary key default gen_random_uuid(),
  claim_id       uuid not null unique references claims (id) on delete cascade,
  submitted_by   uuid not null references profiles (id),
  reason         text not null,
  evidence_path  text not null,    -- Storage path is required
  deadline_at    timestamptz not null,
  resolved       boolean not null default false,
  resolution     text,
  resolved_at    timestamptz,
  resolver_id    uuid references profiles (id),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------------
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references profiles (id),
  action      text not null,
  entity      text not null,         -- e.g. 'claim', 'appeal', 'profile'
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity, entity_id);
create index audit_log_time_idx   on audit_log (occurred_at desc);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS (outbox / delivery log)
-- ---------------------------------------------------------------------------
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id),
  channel      notification_channel not null,
  event        notification_event not null,
  claim_id     uuid references claims (id) on delete set null,
  payload      jsonb not null,
  sent_at      timestamptz,
  error        text,
  created_at   timestamptz not null default now()
);

create index notifications_pending_idx on notifications (created_at) where sent_at is null;

-- ---------------------------------------------------------------------------
-- APP SETTINGS (singleton row for admin-managed config)
-- ---------------------------------------------------------------------------
create table app_settings (
  id                     smallint primary key default 1 check (id = 1),
  notify_on_submit       boolean not null default true,
  notify_on_receipt_miss boolean not null default true,
  notify_on_review       boolean not null default true,
  notify_on_appeal       boolean not null default true,
  notify_on_enforcement  boolean not null default true,
  extra_recipients       jsonb not null default '[]'::jsonb,  -- list of profile ids
  updated_at             timestamptz not null default now()
);

insert into app_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- TRIGGERS: updated_at, audit, deadline management
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on profiles
  for each row execute function touch_updated_at();

create trigger claims_touch before update on claims
  for each row execute function touch_updated_at();

-- Auto-set deadline + initial status when a claim is inserted with no receipt.
create or replace function claims_on_insert() returns trigger
language plpgsql as $$
declare
  has_receipt boolean;
begin
  select exists(select 1 from receipts where claim_id = new.id) into has_receipt;
  if not has_receipt then
    new.status := 'receipt_pending_grace';
    new.receipt_deadline := new.submitted_at + interval '72 hours';
  else
    new.status := 'submitted';
  end if;
  return new;
end $$;

create trigger claims_before_insert before insert on claims
  for each row execute function claims_on_insert();

-- When a receipt is uploaded and claim is still in grace, promote to submitted.
create or replace function receipts_after_insert() returns trigger
language plpgsql as $$
begin
  update claims
     set status = 'submitted',
         receipt_deadline = null
   where id = new.claim_id
     and status in ('receipt_pending_grace', 'receipt_overdue');
  return new;
end $$;

create trigger receipts_after_insert after insert on receipts
  for each row execute function receipts_after_insert();

-- Generic audit helper used by row triggers.
create or replace function audit_row() returns trigger
language plpgsql as $$
declare v_actor uuid;
begin
  v_actor := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  insert into audit_log (actor_id, action, entity, entity_id, old_value, new_value)
  values (
    v_actor,
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id)::uuid,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger claims_audit     after insert or update or delete on claims     for each row execute function audit_row();
create trigger receipts_audit   after insert or update or delete on receipts   for each row execute function audit_row();
create trigger appeals_audit    after insert or update or delete on appeals    for each row execute function audit_row();
create trigger eob_audit        after insert or update or delete on eob_statements for each row execute function audit_row();
create trigger profiles_audit   after update or delete on profiles for each row execute function audit_row();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table profiles        enable row level security;
alter table claims          enable row level security;
alter table receipts        enable row level security;
alter table eob_statements  enable row level security;
alter table appeals         enable row level security;
alter table audit_log       enable row level security;
alter table notifications   enable row level security;
alter table app_settings    enable row level security;

-- Helper: current user's role
create or replace function current_role_code() returns user_role
language sql stable as $$
  select role from profiles where id = auth.uid();
$$;

-- PROFILES
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or current_role_code() = 'provider');
create policy profiles_provider_write on profiles
  for update using (current_role_code() = 'provider')
  with check (current_role_code() = 'provider');

-- CLAIMS
-- Proxies submit claims; Provider reads everything and reviews.
create policy claims_read on claims
  for select using (
    submitter_id = auth.uid()
    or current_role_code() = 'provider'
  );

create policy claims_insert on claims
  for insert with check (
    submitter_id = auth.uid()
    and current_role_code() in ('proxy', 'secondary_proxy')
  );

-- Proxies can update only their own still-editable claims (before review).
create policy claims_update_proxy on claims
  for update using (
    submitter_id = auth.uid()
    and status in ('submitted', 'receipt_pending_grace', 'correction_requested')
  ) with check (
    submitter_id = auth.uid()
  );

-- Provider can update any claim for review actions.
create policy claims_update_provider on claims
  for update using (current_role_code() = 'provider')
  with check (current_role_code() = 'provider');

-- RECEIPTS
create policy receipts_read on receipts
  for select using (
    uploaded_by = auth.uid()
    or exists (select 1 from claims c where c.id = claim_id and c.submitter_id = auth.uid())
    or current_role_code() = 'provider'
  );
create policy receipts_insert on receipts
  for insert with check (
    uploaded_by = auth.uid()
    and exists (select 1 from claims c where c.id = claim_id and c.submitter_id = auth.uid())
  );

-- EOB: Provider writes, all stakeholders on the claim can read.
create policy eob_read on eob_statements
  for select using (
    current_role_code() = 'provider'
    or exists (select 1 from claims c where c.id = claim_id and c.submitter_id = auth.uid())
  );
create policy eob_write on eob_statements
  for all using (current_role_code() = 'provider')
  with check (current_role_code() = 'provider');

-- APPEALS
create policy appeals_read on appeals
  for select using (
    submitted_by = auth.uid()
    or current_role_code() = 'provider'
  );
create policy appeals_insert on appeals
  for insert with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from claims c
       where c.id = claim_id
         and c.submitter_id = auth.uid()
         and c.status in ('denied', 'correction_requested', 'escalated')
    )
  );
create policy appeals_resolve on appeals
  for update using (current_role_code() = 'provider')
  with check (current_role_code() = 'provider');

-- AUDIT LOG: read-only for provider; proxies can see entries they authored.
create policy audit_read on audit_log
  for select using (
    current_role_code() = 'provider'
    or actor_id = auth.uid()
  );

-- NOTIFICATIONS: recipients can see their own; provider sees all.
create policy notifications_read on notifications
  for select using (
    recipient_id = auth.uid()
    or current_role_code() = 'provider'
  );

-- APP SETTINGS: provider-only
create policy app_settings_read on app_settings
  for select using (auth.uid() is not null);
create policy app_settings_write on app_settings
  for update using (current_role_code() = 'provider')
  with check (current_role_code() = 'provider');

-- ---------------------------------------------------------------------------
-- STORAGE bucket for receipts & evidence (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

create policy "receipts read own or provider" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (
      owner = auth.uid()
      or current_role_code() = 'provider'
    )
  );

create policy "receipts upload authenticated" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and auth.uid() is not null
  );
