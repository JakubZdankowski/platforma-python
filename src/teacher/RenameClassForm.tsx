import { useState, type FormEvent } from 'react';
import { CLASS_NAME_MAX, normalizeName } from '../auth/credentials';
import { renameClass } from '../classes/classService';
import type { AppSupabaseClient } from '../database/supabase';
import type { Messages } from '../i18n/en';

/** Class heading that switches to a small form for renaming. */
export function RenameClassForm({ client, classId, name, messages: t, onRenamed }: {
  client: AppSupabaseClient;
  classId: string;
  name: string;
  messages: Messages;
  onRenamed: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return <div className="class-title">
      <h1>{name}</h1>
      <button type="button" className="button button-quiet button-small" onClick={() => setEditing(true)}>{t.renameClass}</button>
    </div>;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const newName = normalizeName(value);
    if (!newName) return setError(t.classNameRequired);
    setSubmitting(true);
    setError(null);
    const result = await renameClass(client, classId, newName);
    setSubmitting(false);
    if (!result.ok) return setError(t.saveFailed);
    setEditing(false);
    onRenamed();
  };

  return <form className="form form-inline class-title" onSubmit={(event) => void submit(event)} noValidate>
    <label className="field">
      <span>{t.className}</span>
      <input name="className" value={value} maxLength={CLASS_NAME_MAX} onChange={(event) => setValue(event.target.value)} autoFocus required />
    </label>
    <button type="submit" className="button button-primary" disabled={submitting}>{t.save}</button>
    <button type="button" className="button button-quiet" onClick={() => { setEditing(false); setValue(name); setError(null); }}>{t.cancel}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
