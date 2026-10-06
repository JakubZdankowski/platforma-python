import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import { listStudentClasses } from '../classes/classService';
import type { Messages } from '../i18n/en';

type ClassesState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; classes: { id: string; name: string }[] };

export function StudentHomePage({ messages: t }: { messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const [state, setState] = useState<ClassesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void listStudentClasses(client).then((result) => {
      if (active) setState(result.ok ? { status: 'ready', classes: result.value } : { status: 'error' });
    });
    return () => { active = false; };
  }, [client, attempt]);

  return <main className="account-page">
    <h1>{t.studentGreeting(profile.displayName)}</h1>
    <section className="account-section" aria-labelledby="student-classes-heading">
      <h2 id="student-classes-heading">{t.yourClasses}</h2>
      {state.status === 'loading' && <p className="account-muted" role="status">{t.loadingData}</p>}
      {state.status === 'error' && <div className="form-error" role="alert">
        <p>{t.dataUnavailable}</p>
        <button type="button" className="button button-secondary button-small" onClick={() => setAttempt((value) => value + 1)}>{t.retry}</button>
      </div>}
      {state.status === 'ready' && (state.classes.length === 0
        ? <p className="account-muted">{t.noStudentClasses}</p>
        : <ul className="class-list" aria-label={t.yourClasses}>
          {state.classes.map((item) => <li key={item.id}>{item.name}</li>)}
        </ul>)}
    </section>
    <section className="account-section">
      <p className="account-muted">{t.lessonsComingSoon}</p>
      <p><Link to="/">{t.practiceLink}</Link></p>
    </section>
  </main>;
}
