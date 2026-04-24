import { supabase } from './supabase';
import { PREVIEW_MODE } from './env';
import { mockAppeals, mockClaims, mockEob, mockReceipts } from './mockData';
import type { Appeal, Claim, EobStatement, Receipt } from '../types/db';

export async function listClaims(): Promise<Claim[]> {
  if (PREVIEW_MODE) return mockClaims;
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Claim[];
}

export async function getClaim(id: string): Promise<{ claim: Claim; receipts: Receipt[]; appeal: Appeal | null; eob: EobStatement | null; }> {
  if (PREVIEW_MODE) {
    const claim = mockClaims.find((c) => c.id === id);
    if (!claim) throw new Error('preview: claim not found');
    return {
      claim,
      receipts: mockReceipts.filter((r) => r.claim_id === id),
      appeal: mockAppeals[id] ?? null,
      eob: mockEob[id] ?? null,
    };
  }
  const [{ data: claim, error: cErr }, { data: receipts }, { data: appeal }, { data: eob }] = await Promise.all([
    supabase.from('claims').select('*').eq('id', id).single(),
    supabase.from('receipts').select('*').eq('claim_id', id),
    supabase.from('appeals').select('*').eq('claim_id', id).maybeSingle(),
    supabase.from('eob_statements').select('*').eq('claim_id', id).maybeSingle(),
  ]);
  if (cErr || !claim) throw cErr ?? new Error('claim not found');
  return {
    claim: claim as Claim,
    receipts: (receipts ?? []) as Receipt[],
    appeal: (appeal ?? null) as Appeal | null,
    eob: (eob ?? null) as EobStatement | null,
  };
}

export interface ClaimInput {
  vendor: string;
  purchase_date: string;
  amount_cents: number;
  classification: 'essential' | 'extra' | 'discretionary';
  agreement_section?: string;
  notes?: string;
  has_receipt: boolean;
}

export async function submitClaim(input: ClaimInput): Promise<Claim> {
  if (PREVIEW_MODE) {
    const now = new Date().toISOString();
    const c: Claim = {
      id: `preview-${Date.now()}`,
      submitter_id: 'proxy-1',
      vendor: input.vendor,
      purchase_date: input.purchase_date,
      amount_cents: input.amount_cents,
      classification: input.classification,
      agreement_section: input.agreement_section ?? null,
      notes: input.notes ?? null,
      status: input.has_receipt ? 'submitted' : 'receipt_pending_grace',
      enforcement_level: 'none',
      receipt_deadline: input.has_receipt ? null : new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      submitted_at: now, reviewed_at: null, reviewer_id: null,
      created_at: now, updated_at: now,
    };
    mockClaims.unshift(c);
    return c;
  }
  const { data, error } = await supabase.functions.invoke('submit-claim', { body: input });
  if (error) throw error;
  return (data as { claim: Claim }).claim;
}

export async function reviewClaim(params: {
  claim_id: string;
  action: 'approve' | 'deny' | 'request_correction' | 'escalate';
  reason?: string;
  allowed_cents?: number;
  provider_resp_cents?: number;
  proxy_resp_cents?: number;
  beneficiary_impact_note?: string;
  enforcement_level?: 'warning' | 'deductible' | 'suspended';
}): Promise<void> {
  if (PREVIEW_MODE) {
    const c = mockClaims.find((x) => x.id === params.claim_id);
    if (!c) return;
    const map = {
      approve: 'approved', deny: 'denied',
      request_correction: 'correction_requested', escalate: 'escalated',
    } as const;
    c.status = map[params.action];
    c.reviewed_at = new Date().toISOString();
    c.reviewer_id = 'prov-1';
    return;
  }
  const { error } = await supabase.functions.invoke('review-claim', { body: params });
  if (error) throw error;
}

export async function uploadReceipt(claimId: string, userId: string, file: { uri: string; name: string; mimeType?: string }): Promise<Receipt> {
  if (PREVIEW_MODE) {
    const r: Receipt = {
      id: `preview-r-${Date.now()}`,
      claim_id: claimId,
      storage_path: `receipts/${claimId}/${file.name}`,
      mime_type: file.mimeType ?? null,
      byte_size: null,
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
    };
    mockReceipts.push(r);
    const c = mockClaims.find((x) => x.id === claimId);
    if (c && (c.status === 'receipt_pending_grace' || c.status === 'receipt_overdue')) {
      c.status = 'submitted';
      c.receipt_deadline = null;
    }
    return r;
  }
  const path = `${claimId}/${Date.now()}-${file.name}`;
  const resp = await fetch(file.uri);
  const blob = await resp.blob();
  const { error: upErr } = await supabase.storage.from('receipts').upload(path, blob, {
    contentType: file.mimeType ?? 'application/octet-stream',
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase.from('receipts').insert({
    claim_id: claimId,
    storage_path: path,
    mime_type: file.mimeType ?? null,
    uploaded_by: userId,
  }).select('*').single();
  if (error) throw error;
  return data as Receipt;
}

export async function submitAppeal(params: {
  claim_id: string;
  reason: string;
  evidence_path: string;
}): Promise<Appeal> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  if (PREVIEW_MODE) {
    const a: Appeal = {
      id: `preview-a-${Date.now()}`,
      claim_id: params.claim_id,
      submitted_by: 'proxy-1',
      reason: params.reason,
      evidence_path: params.evidence_path,
      deadline_at: deadline.toISOString(),
      resolved: false, resolution: null, resolved_at: null, resolver_id: null,
      created_at: new Date().toISOString(),
    };
    mockAppeals[params.claim_id] = a;
    const c = mockClaims.find((x) => x.id === params.claim_id);
    if (c) c.status = 'appealed';
    return a;
  }
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('appeals').insert({
    claim_id: params.claim_id,
    submitted_by: user.user?.id,
    reason: params.reason,
    evidence_path: params.evidence_path,
    deadline_at: deadline.toISOString(),
  }).select('*').single();
  if (error) throw error;
  await supabase.from('claims').update({ status: 'appealed' }).eq('id', params.claim_id);
  return data as Appeal;
}
