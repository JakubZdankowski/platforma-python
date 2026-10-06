import { useState, type FormEvent } from 'react';
import { DISPLAY_NAME_MAX, USERNAME_MAX, isValidUsername, normalizeName, normalizeUsername, suggestUsername } from '../auth/credentials';
import { createStudent, type NewStudentCredentials } from '../classes/classService';
import type { AppSupabaseClient } from '../database/supabase';
import type { Messages } from '../i18n/en';

export function NewStudentForm({ client, classId, messages: t, onCreated }: {
  client: AppSupabaseClient;
  classId: string;
  messages: Messages;
  onCreated: (credentials: NewStudentCredentials, displayName: string) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  // Until the teacher edits the username, it follows the display name.
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeDisplayName = (value: string) => {
    setDisplayName(value);
    if (!usernameEdited) setUsername(suggestUsername(value));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = normalizeName(displayName);
    const login = normalizeUsername(username);
    if (!name) return setError(t.displayNameRequired);
    if (!isValidUsername(login)) return setError(t.usernameRules);
    setSubmitting(true);
    setError(null);
    const result = await createStudent(client, classId, login, name);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error === 'username-taken' ? t.usernameTaken : result.error === 'invalid-input' ? t.usernameRules : t.saveFailed);
      return;
    }
    setDisplayName('');
    setUsername('');
    setUsernameEdited(false);
    onCreated(result.value, name);
  };

  return <form className="form" onSubmit={(event) => void submit(event)} noValidate>
    <div className="form-row">
      <label className="field">
        <span>{t.displayName}</span>
        <input name="displayName" value={displayName} maxLength={DISPLAY_NAME_MAX} onChange={(event) => changeDisplayName(event.target.value)} autoComplete="off" required />
      </label>
      <label className="field">
        <span>{t.username}</span>
        <input
          name="newUsername"
          value={username}
          maxLength={USERNAME_MAX}
          onChange={(event) => { setUsername(event.target.value); setUsernameEdited(true); }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="username-rules"
          required
        />
      </label>
    </div>
    <p id="username-rules" className="field-hint">{t.usernameRules}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div><button type="submit" className="button button-primary" disabled={submitting}>{t.addStudent}</button></div>
  </form>;
}
