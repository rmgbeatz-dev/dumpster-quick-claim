import Constants from 'expo-constants';

function fromExpoConfig(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const val = extra?.[key];
  return typeof val === 'string' && val !== 'SET_VIA_ENV' ? val : undefined;
}

function readEnv(key: string): string | undefined {
  const v = (process.env as Record<string, string | undefined>)[key];
  return v && v.length > 0 ? v : undefined;
}

export const SUPABASE_URL =
  readEnv('EXPO_PUBLIC_SUPABASE_URL') ?? fromExpoConfig('supabaseUrl') ?? '';

export const SUPABASE_ANON_KEY =
  readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? fromExpoConfig('supabaseAnonKey') ?? '';

export const APP_TIMEZONE = readEnv('EXPO_PUBLIC_APP_TIMEZONE') ?? 'America/New_York';

export function assertEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // eslint-disable-next-line no-console
    console.warn(
      '[env] Supabase URL/anon key missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
}
