import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, assertEnv } from './env';

assertEnv();

// In preview mode SUPABASE_URL/ANON_KEY are empty. createClient throws on
// empty url, so use a safe localhost placeholder; PREVIEW_MODE short-circuits
// every real call before it hits the wire.
const url = SUPABASE_URL || 'http://localhost:54321';
const key = SUPABASE_ANON_KEY || 'preview-anon-key';

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
