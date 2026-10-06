import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import type { Messages } from '../i18n/en';
import { useAuth } from './AuthProvider';
import type { UserRole } from './authService';

export function homePath(role: UserRole): string {
  return role === 'teacher' ? '/teacher' : '/student';
}

export function loginPath(role: UserRole): string {
  return role === 'teacher' ? '/login' : '/join';
}

/**
 * Navigation guard only. Real access control is enforced by RLS and the
 * teacher-students function; this just keeps users on screens meant for them.
 */
export function RequireRole({ role, messages: t, children }: { role: UserRole; messages: Messages; children: ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'signed-out') return <Navigate to={loginPath(role)} replace />;
  if (state.status === 'signed-in') {
    return state.profile.role === role ? children : <Navigate to={homePath(state.profile.role)} replace />;
  }
  return <AuthStatus messages={t} />;
}

/** Loading, error and no-access states shared by guarded pages and login pages. */
export function AuthStatus({ messages: t }: { messages: Messages }) {
  const { state, retry, signOut } = useAuth();
  if (state.status === 'error') {
    return <main className="account-page account-narrow">
      <p className="form-error" role="alert">{t.authUnavailable}</p>
      <button type="button" className="button button-secondary" onClick={retry}>{t.retry}</button>
    </main>;
  }
  if (state.status === 'no-access') {
    return <main className="account-page account-narrow">
      <p className="form-error" role="alert">{t.noAccess}</p>
      <button type="button" className="button button-secondary" onClick={() => void signOut()}>{t.signOut}</button>
    </main>;
  }
  return <main className="account-page account-narrow"><p className="account-muted" role="status">{t.authLoading}</p></main>;
}
