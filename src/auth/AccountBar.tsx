import { useNavigate } from 'react-router';
import { createPortal } from 'react-dom';
import type { Messages } from '../i18n/en';
import { useAuth } from './AuthProvider';
import { loginPath } from './RequireRole';

/** Who is signed in, with a clearly visible sign-out button for shared classroom computers. */
export function AccountBar({ messages: t, target }: { messages: Messages; target: HTMLElement | null }) {
  const { state, signOut } = useAuth();
  const navigate = useNavigate();
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
        <span className="account-muted"> · {profile.role === 'teacher' ? t.roleTeacher : profile.username}</span>
      </p>
      <button type="button" className="button button-secondary button-small" onClick={() => void handleSignOut()}>{t.signOut}</button>
  </>, target);
}
