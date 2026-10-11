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
  const { pathname } = useLocation();
  if (state.status === 'signed-out' && target && pathname === '/') return createPortal(<Link to="/join" className="header-link">{t.signIn}</Link>, target);
  if (state.status !== 'signed-in' || !target) return null;
  const { profile } = state;

  const handleSignOut = async () => {
    await signOut();
    void navigate(loginPath(profile.role), { replace: true });
  };

  return createPortal(<>
      <p className="header-account-summary">
        <span className="account-muted">{t.signedInAs} </span>
        <strong>{profile.displayName}</strong>
        <span className="account-muted"> · {profile.role === 'admin' ? 'Administrator' : profile.role === 'teacher' ? t.roleTeacher : profile.username}</span>
      </p>
      <Button type="button" variant="secondary" size="compact" onClick={() => void handleSignOut()}>{t.signOut}</Button>
  </>, target);
}
