// Mock data used for the in-app Preview / design walkthrough when no Supabase
// credentials are configured (e.g. local web preview). Nothing here is used
// in a real deployment.
import type { Appeal, AuditEntry, Claim, EobStatement, Profile, Receipt } from '../types/db';

export const mockProvider: Profile = {
  id: 'prov-1',
  role: 'provider',
  display_name: 'Ryan Griffiths',
  email: 'ryan@example.test',
  phone_e164: null,
  active: true,
  created_at: '2026-04-01T12:00:00Z',
  updated_at: '2026-04-01T12:00:00Z',
};

export const mockProxy: Profile = {
  id: 'proxy-1',
  role: 'proxy',
  display_name: 'Tara Sellers',
  email: 'tara@example.test',
  phone_e164: null,
  active: true,
  created_at: '2026-04-01T12:00:00Z',
  updated_at: '2026-04-01T12:00:00Z',
};

export const mockSecondaryProxy: Profile = {
  id: 'proxy-2',
  role: 'secondary_proxy',
  display_name: 'Patrick',
  email: 'patrick@example.test',
  phone_e164: null,
  active: true,
  created_at: '2026-04-01T12:00:00Z',
  updated_at: '2026-04-01T12:00:00Z',
};

const tomorrow = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString();

export const mockClaims: Claim[] = [
  {
    id: 'c-1', submitter_id: 'proxy-1',
    vendor: 'CVS Pharmacy', purchase_date: '2026-04-23', amount_cents: 4523,
    classification: 'essential', agreement_section: 'Section 3.a',
    notes: 'Prescription refill for acute condition.',
    status: 'receipt_pending_grace', enforcement_level: 'none',
    receipt_deadline: tomorrow,
    submitted_at: '2026-04-23T18:30:00Z', reviewed_at: null, reviewer_id: null,
    created_at: '2026-04-23T18:30:00Z', updated_at: '2026-04-23T18:30:00Z',
  },
  {
    id: 'c-2', submitter_id: 'proxy-1',
    vendor: 'Walgreens', purchase_date: '2026-04-22', amount_cents: 2899,
    classification: 'extra', agreement_section: 'Section 3.b',
    notes: 'Humidifier + saline.',
    status: 'approved', enforcement_level: 'none',
    receipt_deadline: null,
    submitted_at: '2026-04-22T14:10:00Z', reviewed_at: '2026-04-22T22:00:00Z', reviewer_id: 'prov-1',
    created_at: '2026-04-22T14:10:00Z', updated_at: '2026-04-22T22:00:00Z',
  },
  {
    id: 'c-3', submitter_id: 'proxy-2',
    vendor: 'Uber', purchase_date: '2026-04-20', amount_cents: 3120,
    classification: 'discretionary', agreement_section: 'Section 4',
    notes: 'Non-medical transport.',
    status: 'denied', enforcement_level: 'warning',
    receipt_deadline: null,
    submitted_at: '2026-04-20T09:00:00Z', reviewed_at: '2026-04-21T11:00:00Z', reviewer_id: 'prov-1',
    created_at: '2026-04-20T09:00:00Z', updated_at: '2026-04-21T11:00:00Z',
  },
  {
    id: 'c-4', submitter_id: 'proxy-1',
    vendor: 'Rite Aid', purchase_date: '2026-04-18', amount_cents: 6750,
    classification: 'essential', agreement_section: 'Section 3.a',
    notes: 'Missed 72-hour receipt window.',
    status: 'receipt_overdue', enforcement_level: 'deductible',
    receipt_deadline: '2026-04-21T09:00:00Z',
    submitted_at: '2026-04-18T09:00:00Z', reviewed_at: null, reviewer_id: null,
    created_at: '2026-04-18T09:00:00Z', updated_at: '2026-04-21T09:00:01Z',
  },
];

export const mockReceipts: Receipt[] = [
  {
    id: 'r-1', claim_id: 'c-2', storage_path: 'receipts/c-2/receipt.jpg',
    mime_type: 'image/jpeg', byte_size: 120034, uploaded_by: 'proxy-1',
    uploaded_at: '2026-04-22T14:11:00Z',
  },
];

export const mockEob: Record<string, EobStatement> = {
  'c-2': {
    claim_id: 'c-2', billed_cents: 2899, allowed_cents: 2899,
    provider_resp_cents: 2899, proxy_resp_cents: 0,
    beneficiary_impact_note: 'Fully covered under Section 3.b allowance.',
    generated_at: '2026-04-22T22:00:00Z', generated_by: 'prov-1',
  },
  'c-3': {
    claim_id: 'c-3', billed_cents: 3120, allowed_cents: 0,
    provider_resp_cents: 0, proxy_resp_cents: 3120,
    beneficiary_impact_note: 'Not reimbursable under current agreement.',
    generated_at: '2026-04-21T11:00:00Z', generated_by: 'prov-1',
  },
};

export const mockAppeals: Record<string, Appeal> = {
  'c-3': {
    id: 'a-1', claim_id: 'c-3', submitted_by: 'proxy-2',
    reason: 'Trip was part of a medical appointment pickup; see attached log.',
    evidence_path: 'receipts/appeals/c-3/log.pdf',
    deadline_at: '2026-04-28T11:00:00Z',
    resolved: false, resolution: null, resolved_at: null, resolver_id: null,
    created_at: '2026-04-22T15:00:00Z',
  },
};

export const mockAudit: AuditEntry[] = [
  {
    id: 104, actor_id: 'prov-1', action: 'update', entity: 'claims',
    entity_id: 'c-2', old_value: { status: 'submitted' },
    new_value: { status: 'approved' }, occurred_at: '2026-04-22T22:00:00Z',
  },
  {
    id: 103, actor_id: 'prov-1', action: 'insert', entity: 'eob_statements',
    entity_id: 'c-2', old_value: null, new_value: { allowed_cents: 2899 },
    occurred_at: '2026-04-22T22:00:00Z',
  },
  {
    id: 102, actor_id: 'proxy-1', action: 'insert', entity: 'receipts',
    entity_id: 'r-1', old_value: null,
    new_value: { storage_path: 'receipts/c-2/receipt.jpg' },
    occurred_at: '2026-04-22T14:11:00Z',
  },
  {
    id: 101, actor_id: 'proxy-1', action: 'insert', entity: 'claims',
    entity_id: 'c-2', old_value: null,
    new_value: { vendor: 'Walgreens', amount_cents: 2899 },
    occurred_at: '2026-04-22T14:10:00Z',
  },
];

export const mockSettings = {
  id: 1,
  notify_on_submit: true,
  notify_on_receipt_miss: true,
  notify_on_review: true,
  notify_on_appeal: true,
  notify_on_enforcement: true,
  extra_recipients: [] as string[],
  updated_at: '2026-04-22T22:00:00Z',
};
