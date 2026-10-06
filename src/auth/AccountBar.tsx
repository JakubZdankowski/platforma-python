import { useNavigate } from 'react-router';
import type { Messages } from '../i18n/en';
import { useAuth } from './AuthProvider';
import { loginPath } from './RequireRole';

/** Who is signed in, with a clearly visible sign-out button for shared classroom computers. */
export function AccountBar({ messages: t }: { messages: Messages }) {
  const { state, signOut } = useAuth();
  const navigate = useNavigate();
  if (state.status !== 'signed-in') return null;
  const { profile } = state;

  const handleSignOut = async () => {
    await signOut();
    void navigate(loginPath(profile.role), { replace: true });
  };

  return <div className="account-bar">
    <div className="account-bar-inner">
      <p>
        <span className="account-muted">{t.signedInAs} </span>
        <strong>{profile.displayName}</strong>
        <span className="account-muted"> · {profile.role === 'teacher' ? t.roleTeacher : profile.username}</span>
      </p>
      <button type="button" className="button button-secondary button-small" onClick={() => void handleSignOut()}>{t.signOut}</button>
    </div>
  </div>;
}
