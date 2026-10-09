import { useEffect, useState } from 'react';
import { useAuth, useProfile } from '../auth/AuthProvider';
import { listTeacherStudents, type Student } from '../classes/classService';
import { ClassStudents } from './ClassStudents';
import { NewStudentForm } from './NewStudentForm';
import { CredentialNotice, type IssuedCredentials } from './CredentialNotice';
import type { Messages } from '../i18n/en';

export function TeacherStudentsPage({ messages: t }: { messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(null);
  useEffect(() => {
    let active = true;
    setError(false);
    void listTeacherStudents(client, profile.id).then((r) => { if (active) { if (r.ok) setStudents(r.value); else setError(true); } }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [client, profile.id, attempt]);
  return <main className="account-page"><h1>Uczniowie</h1><p className="account-lead">Konta uczniów są niezależne od grup. Do logowania wystarczą nazwa użytkownika i hasło.</p>
    {credentials && <CredentialNotice credentials={credentials} messages={t} onDismiss={() => setCredentials(null)} />}
    {error ? <div className="form-error" role="alert">{t.dataUnavailable}<button className="button button-secondary" onClick={() => setAttempt((v) => v + 1)}>{t.retry}</button></div>
      : students ? <ClassStudents client={client} students={students} messages={t} onChanged={() => setAttempt((v) => v + 1)} onPasswordReset={(s, password) => setCredentials({ ...s, password })} />
      : <p role="status">{t.loadingData}</p>}
    <section className="account-section"><h2>Nowe konto ucznia</h2><NewStudentForm client={client} messages={t} onCreated={(c, displayName) => { setCredentials({ ...c, displayName }); setAttempt((v) => v + 1); }} /></section>
  </main>;
}
