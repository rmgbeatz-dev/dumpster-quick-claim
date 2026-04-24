# Logistical Dumpster

Structured claim, receipt, appeal, and enforcement ledger for Provider/Proxy
expense and medical-logistics tracking.

**Stack:** Expo (React Native) + TypeScript · Supabase (Postgres, Auth, Storage,
RLS, Edge Functions) · Twilio SMS · Resend/SendGrid email · Eastern Time
timestamps · GitHub Actions CI.

## Roles

| Role | Who | Permissions |
| --- | --- | --- |
| Provider | Ryan Griffiths | Final authority. Review, approve, deny, escalate, resolve appeals, admin settings. |
| Proxy | Tara Sellers | Submit claims, upload receipts, file appeals. |
| Secondary Proxy | Patrick | Backup logistics (same rights as Proxy, toggleable active state). |

Roles live in the `profiles` table and are enforced by Postgres RLS — no
personal details or phone numbers are hard-coded.

## Claim lifecycle

```
submit ─┬─► submitted ──► [provider review] ──┬─► approved
        │                                     ├─► denied ──► appealed (7d) ──► appeal_resolved
        │                                     ├─► correction_requested ──► submit again
        │                                     └─► escalated (enforcement++)
        │
        └─► receipt_pending_grace ──(72h)──► receipt_overdue + deductible
                          │
                          └─(receipt uploaded)─► submitted
```

The pure state machine lives in `src/lib/claimState.ts` and is covered by
tests in `__tests__/claimState.test.ts`.

## Features

1. Email/password auth (Supabase).
2. Role-aware dashboard.
3. Submit claim: vendor, date, amount, classification, agreement section,
   notes, optional receipt upload (image picker).
4. Automatic 72-hour grace period when no receipt is attached (Day-2
   reminder, Day-3 deductible enforcement) via the `claim-lifecycle` edge
   function on cron.
5. Provider review: approve / deny / request correction / escalate.
6. EOB output: billed / allowed / provider responsibility / proxy
   responsibility / beneficiary impact note.
7. Appeals: one per claim, 7-day deadline, evidence upload required.
8. Audit log: every insert/update/delete with actor, old/new JSON, and
   Eastern-Time display.
9. SMS + email fan-out on claim submitted, receipt missing, Day-2 reminder,
   Day-3 overdue, approved, denied, correction, appeal, and enforcement.
10. Admin settings: notification recipients, proxy active/inactive, CSV
    audit export.

## Setup

### Prerequisites

- Node 20+
- npm 10+
- Expo CLI (`npx expo` works fine)
- Supabase CLI (`brew install supabase/tap/supabase` or see docs)

### 1. Install

```sh
npm install
cp .env.example .env
```

Fill in at minimum `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### 2. Local Supabase

```sh
supabase start                # spins up Postgres + Storage + Auth locally
supabase db reset             # applies migrations + seed.sql
```

The seed creates three users:

| Role | Email | Password |
| --- | --- | --- |
| Provider | `ryan@example.test` | `LogDumpster!Provider1` |
| Proxy | `tara@example.test` | `LogDumpster!Proxy1` |
| Secondary Proxy | `patrick@example.test` | `LogDumpster!Proxy2` |

Rotate these before any real deployment.

### 3. Edge functions

Set secrets once (these are *server-side only* — never in the Expo bundle):

```sh
supabase secrets set \
  TWILIO_ACCOUNT_SID=... \
  TWILIO_AUTH_TOKEN=... \
  TWILIO_FROM_NUMBER=... \
  RESEND_API_KEY=... \
  EMAIL_FROM_ADDRESS=no-reply@example.com
```

Deploy:

```sh
supabase functions deploy notify
supabase functions deploy submit-claim
supabase functions deploy review-claim
supabase functions deploy claim-lifecycle
```

Schedule the grace-period worker hourly (Supabase cron or any external
scheduler):

```sql
select cron.schedule(
  'claim-lifecycle-hourly',
  '0 * * * *',
  $$ select net.http_post(
       'https://<project-ref>.functions.supabase.co/claim-lifecycle',
       '{}'::jsonb,
       '{"Content-Type":"application/json"}'::jsonb
     ) $$
);
```

### 4. Run the app

```sh
npm start             # Expo dev server
npm run ios           # iOS simulator
npm run android       # Android emulator
```

## Testing

```sh
npm run typecheck
npm run lint
npm test              # claim state + format utilities
```

The state-transition suite enforces all lifecycle guards (grace expiry,
appeal window, enforcement bump, etc.).

## Project layout

```
App.tsx                         Expo entry
app.json                        Expo config
src/
  contexts/AuthContext.tsx      Supabase auth + profile hook
  navigation/RootNavigator.tsx  Stack navigator
  screens/                      Login, Dashboard, SubmitClaim, ClaimDetail,
                                Appeal, AuditLog, AdminSettings
  components/StatusBadge.tsx    Claim-status pill
  lib/claimState.ts             Pure claim state machine (tested)
  lib/claims.ts                 Supabase helpers (list/get/review/upload)
  lib/supabase.ts               Supabase client (AsyncStorage-backed)
  lib/time.ts                   Eastern-Time formatting
  lib/format.ts                 dollars / cents / CSV helpers
  lib/env.ts                    Env resolution
  types/db.ts                   TS types mirroring Postgres schema
supabase/
  config.toml                   Local CLI config
  migrations/                   SQL schema + RLS
  seed.sql                      Seed users + sample claim
  functions/
    _shared/                    CORS, client factories, notify helpers
    notify/                     Generic SMS+email fan-out
    submit-claim/               Claim insert + receipt-missing notification
    review-claim/               Approve/deny/correction/escalate + EOB
    claim-lifecycle/            Day-2 reminder + Day-3 enforcement (cron)
__tests__/                      Jest unit tests
.github/workflows/ci.yml        Typecheck, lint, and tests on PR
```

## Security notes

- No phone numbers, emails, API keys, or tokens are hard-coded. Profiles
  hold PII; secrets live in `.env` / `supabase secrets set`.
- Row Level Security is enabled on every table. Policies restrict proxies
  to their own claims and reserve review/admin operations for the Provider.
- Storage bucket `receipts` is private; only the uploader or the Provider
  can read objects.
- All writes produce an `audit_log` row via triggers; the log is
  append-only for proxies (they can read only their own authored rows).
- Edge functions use the service-role key inside the Supabase runtime;
  it is never shipped to the Expo bundle.
