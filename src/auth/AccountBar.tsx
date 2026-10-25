import { Button } from '../app/ui/Button';
import { Link, useLocation, useNavigate } from 'react-router';
import { createPortal } from 'react-dom';
import type { Messages } from '../i18n/en';
import { useAuth } from './AuthProvider';
import { loginPath } from './RequireRole';

/** Who is signed in, with a clearly visible sign-out button for shared classroom computers. */
export function AccountBar({ messages: t, target }: { messages: Messages; target: HTMLElement | null }) {
  const { state, signOut } = useAuth();
  const navigate = useNavigate();
  if (state.status === 'signed-out') return <HeaderSignIn target={target} label={t.signIn} />;
  if (state.status !== 'signed-in' || !target) return null;
  const { profile } = state;

  const handleSignOut = async () => {
    await signOut();
    void navigate(loginPath(profile.role), { replace: true });
  };

  return createPortal(<>
      <p className="header-account-summary">
        {profile.role !== 'teacher' && <span className="account-muted">{t.signedInAs} </span>}
        <strong>{profile.displayName}</strong>
        <span className="account-muted">{profile.role === 'teacher' ? ` (${t.roleTeacher})` : ` · ${profile.role === 'admin' ? 'Administrator' : profile.username}`}</span>
      </p>
      <Button type="button" variant="secondary" size="compact" onClick={() => void handleSignOut()}>{t.signOut}</Button>
  </>, target);
}

export function HeaderSignIn({ target, label }: { target: HTMLElement | null; label: string }) {
  const { pathname } = useLocation();
  if (['/join', '/login'].includes(pathname.replace(/\/$/, ''))) return null;
  return target ? createPortal(<Link to="/" className="header-link">{label}</Link>, target) : null;
}
