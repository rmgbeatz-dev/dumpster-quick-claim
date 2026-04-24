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

/**
 * Preview mode flips the app into a no-backend, mock-data walkthrough. It
 * auto-activates when Supabase env is missing so `npx expo start --web` just
 * works as a design showcase.
 */
export const PREVIEW_MODE =
  readEnv('EXPO_PUBLIC_PREVIEW') === '1' || !SUPABASE_URL || !SUPABASE_ANON_KEY;

export function assertEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // eslint-disable-next-line no-console
    console.info(
      '[env] Supabase not configured - running in preview mode with mock data.',
    );
  }
}
