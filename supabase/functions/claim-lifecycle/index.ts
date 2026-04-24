// Scheduled (cron) edge function that advances the receipt grace period:
//   Day 2 -> send reminder (claim still missing receipt)
//   Day 3 -> mark claim receipt_overdue + enforcement deductible + notify
// Invoke from Supabase cron (pg_cron or external scheduler) hourly.
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { dispatch, recipientsFor } from '../_shared/notify.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const svc = serviceClient();
    const now = new Date();

    // 1. Day-3 enforcement: deadline passed and still in grace.
    const { data: overdue } = await svc
      .from('claims')
      .select('id, vendor, submitter_id, amount_cents, receipt_deadline')
      .eq('status', 'receipt_pending_grace')
      .lte('receipt_deadline', now.toISOString());

    for (const c of overdue ?? []) {
      await svc.from('claims').update({
        status: 'receipt_overdue',
        enforcement_level: 'deductible',
      }).eq('id', c.id);

      const subject = `Receipt overdue: ${c.vendor}`;
      const body = `72-hour grace period expired. Claim moved to receipt_overdue. Deductible enforcement applied.`;
      const ids = await recipientsFor(svc, 'receipt_overdue_day3');
      if (!ids.includes(c.submitter_id)) ids.push(c.submitter_id);
      await Promise.all(ids.map((id) => dispatch(svc, {
        recipientId: id, event: 'receipt_overdue_day3', claimId: c.id, subject, body,
      })));
    }

    // 2. Day-2 reminders: deadline 24-48h away and still in grace and we haven't
    //    already sent a day-2 reminder for this claim.
    const day2Upper = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const day2Lower = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data: reminders } = await svc
      .from('claims')
      .select('id, vendor, submitter_id, receipt_deadline')
      .eq('status', 'receipt_pending_grace')
      .gte('receipt_deadline', day2Lower)
      .lte('receipt_deadline', day2Upper);

    for (const c of reminders ?? []) {
      const { data: already } = await svc
        .from('notifications')
        .select('id')
        .eq('claim_id', c.id)
        .eq('event', 'receipt_reminder_day2')
        .limit(1);
      if (already && already.length > 0) continue;

      const subject = `Receipt reminder: ${c.vendor}`;
      const body = `Day 2 reminder - receipt still not attached. Deadline: ${c.receipt_deadline}.`;
      const ids = await recipientsFor(svc, 'receipt_reminder_day2');
      if (!ids.includes(c.submitter_id)) ids.push(c.submitter_id);
      await Promise.all(ids.map((id) => dispatch(svc, {
        recipientId: id, event: 'receipt_reminder_day2', claimId: c.id, subject, body,
      })));
    }

    return new Response(JSON.stringify({
      overdue: overdue?.length ?? 0,
      reminders: reminders?.length ?? 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
