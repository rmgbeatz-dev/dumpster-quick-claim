// Shared Supabase client factories for edge functions.
// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function userClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const auth = req.headers.get('Authorization') ?? '';
  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
}
