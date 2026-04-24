// Server-side claim submission. Enforces role + inserts via service role so
// audit + downstream notifications run consistently.
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient, userClient } from '../_shared/supabase.ts';
import { dispatch, recipientsFor } from '../_shared/notify.ts';

interface SubmitPayload {
  vendor: string;
  purchase_date: string;     // YYYY-MM-DD
  amount_cents: number;
  classification: 'essential' | 'extra' | 'discretionary';
  agreement_section?: string;
  notes?: string;
  has_receipt?: boolean;     // client tells us if a receipt was uploaded
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const uc = userClient(req);
    const { data: userData, error: userErr } = await uc.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthenticated' }, 401);

    const svc = serviceClient();
    const { data: profile } = await svc
      .from('profiles').select('id, role, display_name').eq('id', userData.user.id).single();
    if (!profile) return json({ error: 'no profile' }, 403);
    if (profile.role !== 'proxy' && profile.role !== 'secondary_proxy') {
      return json({ error: 'only proxies may submit claims' }, 403);
    }

    const body = (await req.json()) as SubmitPayload;
    if (!body.vendor || !body.purchase_date || typeof body.amount_cents !== 'number') {
      return json({ error: 'missing required fields' }, 400);
    }

    const { data: claim, error: insErr } = await svc.from('claims').insert({
      submitter_id: profile.id,
      vendor: body.vendor,
      purchase_date: body.purchase_date,
      amount_cents: body.amount_cents,
      classification: body.classification,
      agreement_section: body.agreement_section ?? null,
      notes: body.notes ?? null,
    }).select('*').single();
    if (insErr || !claim) return json({ error: insErr?.message ?? 'insert failed' }, 500);

    // Fire notifications.
    const subject = `Claim submitted: ${claim.vendor} ($${(claim.amount_cents / 100).toFixed(2)})`;
    const lineBody = `${profile.display_name} submitted a ${claim.classification} claim for $${(claim.amount_cents / 100).toFixed(2)} at ${claim.vendor}.`;
    const recips = await recipientsFor(svc, 'claim_submitted');
    await Promise.all(recips.map((id) => dispatch(svc, {
      recipientId: id, event: 'claim_submitted', claimId: claim.id, subject, body: lineBody,
    })));

    if (!body.has_receipt) {
      const missSubject = `Receipt missing: ${claim.vendor}`;
      const missBody = `Receipt not attached. Grace period ends ${claim.receipt_deadline}.`;
      const ids = await recipientsFor(svc, 'receipt_missing');
      await Promise.all(ids.map((id) => dispatch(svc, {
        recipientId: id, event: 'receipt_missing', claimId: claim.id,
        subject: missSubject, body: missBody,
      })));
    }

    return json({ claim }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
