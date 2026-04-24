// Ambient declarations so Node's `tsc` can typecheck Supabase Edge Functions
// (which actually run in Deno). The Supabase CLI uses `deno check` for the
// authoritative check at deploy time.

declare const Deno: {
  env: { get(key: string): string | undefined };
};

declare module 'https://deno.land/std@0.203.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.0' {
  export * from '@supabase/supabase-js';
}
