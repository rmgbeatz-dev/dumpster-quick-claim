import { supabase } from './supabase';
import type { Claim, Receipt, Appeal, EobStatement } from '../types/db';

export async function listClaims(): Promise<Claim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Claim[];
}

export async function getClaim(id: string): Promise<{ claim: Claim; receipts: Receipt[]; appeal: Appeal | null; eob: EobStatement | null; }> {
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
  const { error } = await supabase.functions.invoke('review-claim', { body: params });
  if (error) throw error;
}

export async function uploadReceipt(claimId: string, userId: string, file: { uri: string; name: string; mimeType?: string }): Promise<Receipt> {
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
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('appeals').insert({
    claim_id: params.claim_id,
    submitted_by: user.user?.id,
    reason: params.reason,
    evidence_path: params.evidence_path,
    deadline_at: deadline.toISOString(),
  }).select('*').single();
  if (error) throw error;
  // Flip claim status to appealed
  await supabase.from('claims').update({ status: 'appealed' }).eq('id', params.claim_id);
  return data as Appeal;
}
