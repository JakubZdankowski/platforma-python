import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import { listStudentClasses } from '../classes/classService';
import type { Messages } from '../i18n/en';
import { listLessons, type Lesson } from '../lessons/lessonService';

type ClassesState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; classes: { id: string; name: string }[] };

export function StudentHomePage({ messages: t }: { messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const [params] = useSearchParams();
  const [state, setState] = useState<ClassesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const selected = state.status === 'ready' ? state.classes.find((item) => item.id === params.get('class')) : undefined;

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void listStudentClasses(client).then((result) => {
      if (active) setState(result.ok ? { status: 'ready', classes: result.value } : { status: 'error' });
    }).catch(() => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [client, attempt]);

  return <main className="account-page student-home">
    <header className="student-welcome">
      <div>
        <p className="eyebrow">PYTHON · {t.studentSpace}</p>
        <h1>{t.studentGreeting(profile.displayName)}</h1>
        <p className="account-lead">{t.chooseClassHint}</p>
      </div>
      <span className="student-code-mark" aria-hidden="true">{'</>'}</span>
    </header>
    {selected ? <>
      <Link className="student-back" to="/student">← {t.allClasses}</Link>
      <StudentClassLessons key={selected.id} classId={selected.id} name={selected.name} messages={t} />
    </> : <section className="student-classes" aria-labelledby="student-classes-heading">
      <div className="student-section-heading"><h2 id="student-classes-heading">{t.yourClasses}</h2>
        {state.status === 'ready' && <span className="student-count">{state.classes.length}</span>}
      </div>
      {state.status === 'loading' && <p className="student-empty" role="status">{t.loadingData}</p>}
      {state.status === 'error' && <div className="form-error" role="alert"><p>{t.dataUnavailable}</p>
        <button className="button button-secondary" onClick={() => setAttempt((value) => value + 1)}>{t.retry}</button>
      </div>}
      {state.status === 'ready' && (state.classes.length === 0
        ? <div className="student-empty"><h3>{t.noStudentClasses}</h3><p>{t.askTeacherClass}</p></div>
        : <ul className="student-class-grid" aria-label={t.yourClasses}>
          {state.classes.map((item) => <li key={item.id}>
            <Link className="student-class-card" to={`/student?class=${encodeURIComponent(item.id)}`}>
              <span className="student-class-icon" aria-hidden="true">{'{ }'}</span>
              <h3>{item.name}</h3>
              <p>{t.classCardHint}</p>
              <span className="student-card-action">{t.openClass}<span aria-hidden="true">→</span></span>
            </Link>
          </li>)}
        </ul>)}
    </section>}
    <footer className="student-footer"><Link to="/">{t.homeLink}</Link><span>Python · Sky Blue</span></footer>
  </main>;
}

function StudentClassLessons({ classId, name, messages: t }: { classId: string; name: string; messages: Messages }) {
  const { client } = useAuth();
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLessons(null);
    setError(false);
    void listLessons(client, classId).then((result) => { if (active) setLessons(result); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [client, classId, attempt]);
  return <section aria-labelledby="selected-class-heading">
    <div className="student-section-heading"><div><h2 id="selected-class-heading">{name}</h2><p className="account-muted">{t.classLessons}</p></div></div>
    {error ? <div className="form-error" role="alert"><p>{t.dataUnavailable}</p><button className="button button-secondary" onClick={() => setAttempt((n) => n + 1)}>{t.retry}</button></div>
      : lessons === null ? <p className="student-empty" role="status">{t.loadingData}</p>
      : lessons.length === 0 ? <p className="student-empty">{t.noAssignedLessons}</p>
      : <ul className="student-lessons">{lessons.map((lesson, index) => <li className="student-lesson" key={lesson.id}>
        <div className="student-lesson-heading"><span className="student-lesson-number">{String(index + 1).padStart(2, '0')}</span><h3>{lesson.title}</h3></div>
        {lesson.exercises.length ? <ol>{lesson.exercises.map((exercise) => <li key={exercise.id}>
          <Link to={`/student/exercises/${exercise.id}`} state={{ classId }}><span>{exercise.title}</span><span aria-hidden="true">→</span></Link>
        </li>)}</ol> : <p className="account-muted">{t.noClassExercises}</p>}
      </li>)}</ul>}
  </section>;
}
