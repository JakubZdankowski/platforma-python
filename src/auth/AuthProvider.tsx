import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppSupabaseClient } from '../database/supabase';
import { loadProfile, signOut as signOutRequest, type Profile } from './authService';
import { downloadCode } from '../student/downloadCode';

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
  const [sessionEnded, setSessionEnded] = useState(false);
  const [recoveredWork, setRecoveredWork] = useState<{ code: string; title: string } | null>(null);
  const ending = useRef(false);
  const signedIn = useRef(false);
  const manualSignOut = useRef(false);
  const retainWork = useCallback(() => {
    setSessionEnded(true);
    window.dispatchEvent(new CustomEvent('app-session-ended', { detail: {
      retainCode: (code: string, title: string) => setRecoveredWork({ code, title }),
    } }));
  }, []);
  useEffect(() => {
    if (!recoveredWork) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [recoveredWork]);
  const endSession = useCallback(async () => {
    if (ending.current) return;
    ending.current = true;
    retainWork();
    await signOutRequest(client);
    setUserId(null);
  }, [client, retainWork]);

  useEffect(() => {
    // Supabase calls are never awaited inside its auth callback.
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!session && signedIn.current && !manualSignOut.current && !ending.current) retainWork();
      signedIn.current = !!session;
      if (session && event === 'SIGNED_IN') {
        ending.current = false;
        manualSignOut.current = false;
        setSessionEnded(false);
        setRecoveredWork(null);
      }
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, [client, retainWork]);

  useEffect(() => {
    if (userId === undefined) return;
    if (userId === null) {
      setState({ status: 'signed-out' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    (async () => {
      const claimed = await client.rpc('claim_account_session');
      if (!active) return null;
      if (claimed.error) throw claimed.error;
      if (claimed.data !== true) { await endSession(); return null; }
      return loadProfile(client, userId);
    })().then(
      (profile) => { if (active) setState(profile ? { status: 'signed-in', profile } : { status: 'no-access' }); },
      (error: unknown) => {
        console.error(error instanceof Error ? error.message : 'Profile request failed');
        if (active) setState({ status: 'error' });
      },
    );
    return () => { active = false; };
  }, [client, userId, attempt, endSession]);

  useEffect(() => {
    if (!userId || state.status !== 'signed-in') return;
    let active = true;
    let checking = false;
    const check = async () => {
      if (checking || !navigator.onLine || ending.current) return;
      checking = true;
      try {
        const before = (await client.auth.getSession()).data.session?.access_token;
        if (!before) return;
        const result = await client.rpc('is_current_session');
        const after = (await client.auth.getSession()).data.session?.access_token;
        // Ignore a delayed response for a session replaced in this browser.
        if (active && before === after && !result.error && result.data === false) await endSession();
      } catch { /* Network failures do not prove that another login occurred. */ }
      finally { checking = false; }
    };
    const focus = () => { void check(); };
    const timer = window.setInterval(focus, 2000);
    window.addEventListener('focus', focus);
    window.addEventListener('online', focus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', focus);
      window.removeEventListener('online', focus);
    };
  }, [client, userId, state.status, endSession]);

  const signOut = useCallback(() => { manualSignOut.current = true; return signOutRequest(client); }, [client]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const value = useMemo(() => ({ client, state, signOut, retry }), [client, state, signOut, retry]);
  return <AuthContext.Provider value={value}>
    {sessionEnded && <section className="session-ended-notice" role="alert">
      <p>Sesja zakończona. Konto zalogowano w innej przeglądarce lub urządzeniu albo cofnięto dostęp do sesji. Zaloguj się ponownie, aby kontynuować.</p>
      {recoveredWork && <>
        <p>Niezapisany kod zachowano tylko w tej karcie. Pobierz go przed zamknięciem strony lub ponownym logowaniem.</p>
        <details><summary>Zachowany kod: {recoveredWork.title}</summary>
          <textarea aria-label="Zachowany niezapisany kod" readOnly value={recoveredWork.code} />
        </details>
        <button type="button" className="button button-secondary" onClick={() => downloadCode(recoveredWork.code, recoveredWork.title)}>Pobierz zachowany kod .py</button>
      </>}
    </section>}
    {children}
  </AuthContext.Provider>;
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
