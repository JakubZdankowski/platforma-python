import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import { listStudentClasses } from '../classes/classService';
import type { Messages } from '../i18n/en';
import { listLessons, type Lesson } from '../lessons/lessonService';

type ClassesState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; classes: { id: string; name: string }[] };

export function StudentHomePage({ messages: t }: { messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const [state, setState] = useState<ClassesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    setLessons(null);
    void Promise.all([listStudentClasses(client), listLessons(client)]).then(([result, content]) => {
      if (active) {
        setState(result.ok ? { status: 'ready', classes: result.value } : { status: 'error' });
        setLessons(content);
      }
    }).catch(() => { if (active) setState({ status: 'error' }); });
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
      <h2>{t.yourLessons}</h2>
      {lessons && (lessons.length ? <ul className="lesson-list">{lessons.map((lesson) => <li key={lesson.id}>
        <h3>{lesson.title}</h3>
        <ol>{lesson.exercises.map((exercise) => <li key={exercise.id}><Link to={`/student/exercises/${exercise.id}`}>{exercise.title}</Link></li>)}</ol>
      </li>)}</ul> : <p className="account-muted">{t.noAssignedLessons}</p>)}
      <p><Link to="/">{t.practiceLink}</Link></p>
    </section>
  </main>;
}
