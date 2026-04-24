// Manually fan out a notification. Called by the app when an action requires it.
// Request body: { event: NotifyEvent, claimId?: string, subject: string, body: string }
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { dispatch, recipientsFor, NotifyEvent } from '../_shared/notify.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { event, claimId, subject, body } = (await req.json()) as {
      event: NotifyEvent; claimId?: string; subject: string; body: string;
    };
    const svc = serviceClient();
    const ids = await recipientsFor(svc, event);
    await Promise.all(ids.map((id) => dispatch(svc, { recipientId: id, event, claimId, subject, body })));
    return new Response(JSON.stringify({ delivered: ids.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
