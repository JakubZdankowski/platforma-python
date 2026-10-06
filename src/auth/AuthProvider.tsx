import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppSupabaseClient } from '../database/supabase';
import { loadProfile, signOut as signOutRequest, type Profile } from './authService';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  /** Signed in, but the account has no classroom profile. */
  | { status: 'no-access' }
  | { status: 'error' }
  | { status: 'signed-in'; profile: Profile };

interface AuthContextValue {
  client: AppSupabaseClient;
  state: AuthState;
  signOut: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ client, children }: { client: AppSupabaseClient; children: ReactNode }) {
  // undefined = session not known yet, null = signed out.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Only store the id here: Supabase advises against awaiting its calls inside this callback.
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (userId === undefined) return;
    if (userId === null) {
      setState({ status: 'signed-out' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    loadProfile(client, userId).then(
      (profile) => { if (active) setState(profile ? { status: 'signed-in', profile } : { status: 'no-access' }); },
      (error: unknown) => {
        console.error(error instanceof Error ? error.message : 'Profile request failed');
        if (active) setState({ status: 'error' });
      },
    );
    return () => { active = false; };
  }, [client, userId, attempt]);

  const signOut = useCallback(() => signOutRequest(client), [client]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const value = useMemo(() => ({ client, state, signOut, retry }), [client, state, signOut, retry]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** Profile of the signed-in user; only for components rendered behind RequireRole. */
export function useProfile(): Profile {
  const { state } = useAuth();
  if (state.status !== 'signed-in') throw new Error('useProfile requires a signed-in user');
  return state.profile;
}
