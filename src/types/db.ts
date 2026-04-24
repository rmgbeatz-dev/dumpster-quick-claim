export type UserRole = 'provider' | 'proxy' | 'secondary_proxy';

export type Classification = 'essential' | 'extra' | 'discretionary';

export type ClaimStatus =
  | 'submitted'
  | 'receipt_pending_grace'
  | 'receipt_overdue'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'correction_requested'
  | 'appealed'
  | 'appeal_resolved'
  | 'escalated';

export type EnforcementLevel = 'none' | 'warning' | 'deductible' | 'suspended';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  email: string | null;
  phone_e164: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  submitter_id: string;
  vendor: string;
  purchase_date: string;
  amount_cents: number;
  classification: Classification;
  agreement_section: string | null;
  notes: string | null;
  status: ClaimStatus;
  enforcement_level: EnforcementLevel;
  receipt_deadline: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  claim_id: string;
  storage_path: string;
  mime_type: string | null;
  byte_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface EobStatement {
  claim_id: string;
  billed_cents: number;
  allowed_cents: number;
  provider_resp_cents: number;
  proxy_resp_cents: number;
  beneficiary_impact_note: string | null;
  generated_at: string;
  generated_by: string;
}

export interface Appeal {
  id: string;
  claim_id: string;
  submitted_by: string;
  reason: string;
  evidence_path: string;
  deadline_at: string;
  resolved: boolean;
  resolution: string | null;
  resolved_at: string | null;
  resolver_id: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_value: unknown;
  new_value: unknown;
  occurred_at: string;
}

export interface AppSettings {
  id: number;
  notify_on_submit: boolean;
  notify_on_receipt_miss: boolean;
  notify_on_review: boolean;
  notify_on_appeal: boolean;
  notify_on_enforcement: boolean;
  extra_recipients: string[];
  updated_at: string;
}
