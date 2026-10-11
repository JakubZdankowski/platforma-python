import { Notice } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useState } from 'react';
import { removeClassMember, resetStudentPassword, type Student } from '../classes/classService';
import type { AppSupabaseClient } from '../database/supabase';
import type { Messages } from '../i18n/en';

export function ClassStudents({ client, classId, students, messages: t, onPasswordReset, onChanged }: {
  client: AppSupabaseClient;
  classId?: string;
  students: Student[];
  messages: Messages;
  onPasswordReset: (student: Student, password: string) => void;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = async (student: Student) => {
    if (!window.confirm(t.confirmResetPassword(student.displayName))) return;
    setBusyId(student.id);
    setError(null);
    const result = await resetStudentPassword(client, student.id);
    setBusyId(null);
    if (result.ok) onPasswordReset(student, result.value.password);
    else setError(t.saveFailed);
  };

  const remove = async (student: Student) => {
    if (!classId) return;
    if (!window.confirm(t.confirmRemoveStudent(student.displayName))) return;
    setBusyId(student.id);
    setError(null);
    const result = await removeClassMember(client, classId, student.id);
    setBusyId(null);
    if (result.ok) onChanged();
    else setError(t.saveFailed);
  };

  if (students.length === 0) return <p className="account-muted">{t.noClassStudents}</p>;

  return <>
    {error && <Notice tone="error">{error}</Notice>}
    <table className="data-table">
      <thead><tr><th scope="col">{t.displayName}</th><th scope="col">{t.username}</th><th scope="col"><span className="sr-only">{t.actions}</span></th></tr></thead>
      <tbody>
        {students.map((student) => <tr key={student.id}>
          <td>{student.displayName}</td>
          <td><code>{student.username}</code></td>
          <td className="table-actions">
            <Button type="button" variant="secondary" size="compact" disabled={busyId !== null} onClick={() => void resetPassword(student)} aria-label={t.resetPasswordFor(student.displayName)}>{t.resetPassword}</Button>
            {classId && <Button type="button" variant="quiet" size="compact" disabled={busyId !== null} onClick={() => void remove(student)} aria-label={t.removeStudentFor(student.displayName)}>{t.removeFromClass}</Button>}
          </td>
        </tr>)}
      </tbody>
    </table>
  </>;
}
