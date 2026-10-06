import type { Messages } from '../i18n/en';

export interface IssuedCredentials {
  displayName: string;
  username: string;
  password: string;
  joinCode: string;
}

/** A generated password is shown exactly once; it is not stored in plain text anywhere. */
export function CredentialNotice({ credentials, messages: t, onDismiss }: {
  credentials: IssuedCredentials;
  messages: Messages;
  onDismiss: () => void;
}) {
  return <div className="credential-notice" role="status">
    <h3>{t.credentialsTitle(credentials.displayName)}</h3>
    <dl className="credential-list">
      <dt>{t.joinCode}</dt><dd><code>{credentials.joinCode}</code></dd>
      <dt>{t.username}</dt><dd><code>{credentials.username}</code></dd>
      <dt>{t.password}</dt><dd><code data-testid="issued-password">{credentials.password}</code></dd>
    </dl>
    <p className="account-muted">{t.credentialsHint}</p>
    <button type="button" className="button button-secondary button-small" onClick={onDismiss}>{t.hidePassword}</button>
  </div>;
}
