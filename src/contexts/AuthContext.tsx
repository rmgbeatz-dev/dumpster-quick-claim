import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PREVIEW_MODE } from '../lib/env';
import { mockProvider, mockProxy, mockSecondaryProxy } from '../lib/mockData';
import type { Profile } from '../types/db';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  previewMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Preview-only: swap the active role so reviewers can see every screen. */
  setPreviewRole: (role: 'provider' | 'proxy' | 'secondary_proxy') => void;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

const PREVIEW_PROFILES: Record<string, Profile> = {
  provider: mockProvider,
  proxy: mockProxy,
  secondary_proxy: mockSecondaryProxy,
};

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(PREVIEW_MODE ? null : null);
  const [loading, setLoading] = useState(!PREVIEW_MODE);

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data ?? null) as Profile | null);
  }, []);

  useEffect(() => {
    if (PREVIEW_MODE) return;
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      setSession(s);
      await loadProfile(s?.user.id ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (PREVIEW_MODE) {
      // Choose the preview profile by email keyword.
      const match = Object.values(PREVIEW_PROFILES)
        .find((p) => p.email?.split('@')[0] === email.trim().toLowerCase().split('@')[0]);
      const p = match ?? mockProxy;
      setProfile(p);
      setSession({ user: { id: p.id, email: p.email ?? undefined } } as unknown as Session);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (PREVIEW_MODE) { setSession(null); setProfile(null); return; }
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (PREVIEW_MODE) return;
    await loadProfile(session?.user.id ?? null);
  }, [loadProfile, session]);

  const setPreviewRole = useCallback((role: 'provider' | 'proxy' | 'secondary_proxy') => {
    if (!PREVIEW_MODE) return;
    const p = PREVIEW_PROFILES[role];
    setProfile(p);
    setSession({ user: { id: p.id, email: p.email ?? undefined } } as unknown as Session);
  }, []);

  return (
    <AuthCtx.Provider value={{
      session, profile, loading, previewMode: PREVIEW_MODE,
      signIn, signOut, refreshProfile, setPreviewRole,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
