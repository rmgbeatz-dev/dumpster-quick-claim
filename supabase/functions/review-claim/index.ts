// Provider-only: approve, deny, request correction, or escalate enforcement.
// Writes EOB at approve/deny and sends notifications.
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { dispatch, recipientsFor, NotifyEvent } from '../_shared/notify.ts';

type Action = 'approve' | 'deny' | 'request_correction' | 'escalate';

interface ReviewPayload {
  claim_id: string;
  action: Action;
  reason?: string;
  // For approve/deny the provider may override amounts.
  allowed_cents?: number;
  provider_resp_cents?: number;
  proxy_resp_cents?: number;
  beneficiary_impact_note?: string;
  // For escalate
  enforcement_level?: 'warning' | 'deductible' | 'suspended';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const uc = userClient(req);
    const { data: userData } = await uc.auth.getUser();
    if (!userData?.user) return json({ error: 'unauthenticated' }, 401);

    const svc = serviceClient();
    const { data: me } = await svc.from('profiles').select('*').eq('id', userData.user.id).single();
    if (!me || me.role !== 'provider') return json({ error: 'provider only' }, 403);

    const body = (await req.json()) as ReviewPayload;
    const { data: claim } = await svc.from('claims').select('*').eq('id', body.claim_id).single();
    if (!claim) return json({ error: 'claim not found' }, 404);

    let statusUpdate: string = claim.status;
    let enforcement = claim.enforcement_level;
    let event: NotifyEvent = 'approved';

    switch (body.action) {
      case 'approve':
        statusUpdate = 'approved';
        event = 'approved';
        break;
      case 'deny':
        statusUpdate = 'denied';
        event = 'denied';
        break;
      case 'request_correction':
        statusUpdate = 'correction_requested';
        event = 'correction_requested';
        break;
      case 'escalate':
        statusUpdate = 'escalated';
        enforcement = body.enforcement_level ?? 'warning';
        event = 'enforcement_escalated';
        break;
      default:
        return json({ error: 'unknown action' }, 400);
    }

    const { error: updErr } = await svc.from('claims').update({
      status: statusUpdate,
      enforcement_level: enforcement,
      reviewer_id: me.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', claim.id);
    if (updErr) return json({ error: updErr.message }, 500);

    if (body.action === 'approve' || body.action === 'deny') {
      const allowed = body.allowed_cents ?? (body.action === 'approve' ? claim.amount_cents : 0);
      const providerResp = body.provider_resp_cents ?? allowed;
      const proxyResp = body.proxy_resp_cents ?? Math.max(claim.amount_cents - allowed, 0);
      await svc.from('eob_statements').upsert({
        claim_id: claim.id,
        billed_cents: claim.amount_cents,
        allowed_cents: allowed,
        provider_resp_cents: providerResp,
        proxy_resp_cents: proxyResp,
        beneficiary_impact_note: body.beneficiary_impact_note ?? null,
        generated_by: me.id,
      });
    }

    const subject = `Claim ${body.action}: ${claim.vendor}`;
    const text = body.reason
      ? `Provider ${body.action} on claim at ${claim.vendor}. Note: ${body.reason}`
      : `Provider ${body.action} on claim at ${claim.vendor}.`;
    const ids = await recipientsFor(svc, event);
    // Also notify the submitter if not already in the list.
    if (!ids.includes(claim.submitter_id)) ids.push(claim.submitter_id);
    await Promise.all(ids.map((id) => dispatch(svc, {
      recipientId: id, event, claimId: claim.id, subject, body: text,
    })));

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
