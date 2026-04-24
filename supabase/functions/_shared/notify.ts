// Notification delivery helpers: Twilio SMS + Resend/SendGrid email.
// Each function logs a row in `notifications` so the app can show delivery history.
// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type NotifyEvent =
  | 'claim_submitted'
  | 'receipt_missing'
  | 'receipt_reminder_day2'
  | 'receipt_overdue_day3'
  | 'approved'
  | 'denied'
  | 'correction_requested'
  | 'appeal_submitted'
  | 'appeal_resolved'
  | 'enforcement_escalated';

export interface NotifyPayload {
  recipientId: string;
  event: NotifyEvent;
  claimId?: string;
  subject: string;
  body: string;
}

async function sendSms(toE164: string, body: string): Promise<void> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_FROM_NUMBER');
  if (!sid || !token || !from) throw new Error('Twilio env vars not configured');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: toE164, From: from, Body: body });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
}

async function sendEmail(toAddress: string, subject: string, body: string): Promise<void> {
  const from = Deno.env.get('EMAIL_FROM_ADDRESS') ?? 'no-reply@example.com';
  const resend = Deno.env.get('RESEND_API_KEY');
  const sendgrid = Deno.env.get('SENDGRID_API_KEY');

  if (resend) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: toAddress, subject, text: body }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    return;
  }
  if (sendgrid) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sendgrid}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toAddress }] }],
        from: { email: from },
        subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    });
    if (!res.ok) throw new Error(`SendGrid error ${res.status}: ${await res.text()}`);
    return;
  }
  throw new Error('No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY)');
}

/** Fan out a single event to a recipient's phone + email and log delivery. */
export async function dispatch(
  svc: SupabaseClient,
  { recipientId, event, claimId, subject, body }: NotifyPayload,
): Promise<void> {
  const { data: profile, error } = await svc
    .from('profiles')
    .select('phone_e164, email, active')
    .eq('id', recipientId)
    .single();
  if (error || !profile || !profile.active) return;

  const attempts: Array<{ channel: 'sms' | 'email'; run: () => Promise<void> }> = [];
  if (profile.phone_e164) attempts.push({ channel: 'sms', run: () => sendSms(profile.phone_e164!, body) });
  if (profile.email) attempts.push({ channel: 'email', run: () => sendEmail(profile.email!, subject, body) });

  for (const { channel, run } of attempts) {
    let err: string | null = null;
    try { await run(); } catch (e) { err = e instanceof Error ? e.message : String(e); }
    await svc.from('notifications').insert({
      recipient_id: recipientId,
      channel,
      event,
      claim_id: claimId ?? null,
      payload: { subject, body },
      sent_at: err ? null : new Date().toISOString(),
      error: err,
    });
  }
}

/** Resolve all profiles who should receive an event, respecting admin settings. */
export async function recipientsFor(
  svc: SupabaseClient,
  event: NotifyEvent,
): Promise<string[]> {
  const { data: settings } = await svc.from('app_settings').select('*').eq('id', 1).single();
  const settingsAny = (settings ?? {}) as any;
  const toggleMap: Record<NotifyEvent, string> = {
    claim_submitted: 'notify_on_submit',
    receipt_missing: 'notify_on_receipt_miss',
    receipt_reminder_day2: 'notify_on_receipt_miss',
    receipt_overdue_day3: 'notify_on_receipt_miss',
    approved: 'notify_on_review',
    denied: 'notify_on_review',
    correction_requested: 'notify_on_review',
    appeal_submitted: 'notify_on_appeal',
    appeal_resolved: 'notify_on_appeal',
    enforcement_escalated: 'notify_on_enforcement',
  };
  const enabled = settingsAny[toggleMap[event]] ?? true;
  if (!enabled) return [];

  const { data: provider } = await svc
    .from('profiles').select('id').eq('role', 'provider').eq('active', true).limit(1).single();
  const extras: string[] = Array.isArray(settingsAny.extra_recipients)
    ? settingsAny.extra_recipients.filter((x: unknown): x is string => typeof x === 'string')
    : [];

  const set = new Set<string>(extras);
  if (provider?.id) set.add(provider.id);
  return [...set];
}
