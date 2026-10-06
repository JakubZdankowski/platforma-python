import { useState, type FormEvent } from 'react';
import { addClassMember, type Student } from '../classes/classService';
import type { AppSupabaseClient } from '../database/supabase';
import type { Messages } from '../i18n/en';

/** Adds one of the teacher's existing students (e.g. from another class) to this class. */
export function AddExistingStudentForm({ client, classId, candidates, messages: t, onAdded }: {
  client: AppSupabaseClient;
  classId: string;
  candidates: Student[];
  messages: Messages;
  onAdded: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = candidates.some((student) => student.id === studentId) ? studentId : '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    const result = await addClassMember(client, classId, selected);
    setSubmitting(false);
    if (result.ok) {
      setStudentId('');
      onAdded();
    } else setError(t.saveFailed);
  };

  return <form className="form form-inline" onSubmit={(event) => void submit(event)}>
    <label className="field">
      <span>{t.existingStudent}</span>
      <select value={selected} onChange={(event) => setStudentId(event.target.value)}>
        <option value="">{t.chooseStudent}</option>
        {candidates.map((student) => <option key={student.id} value={student.id}>{student.displayName} ({student.username})</option>)}
      </select>
    </label>
    <button type="submit" className="button button-secondary" disabled={!selected || submitting}>{t.addToClass}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
