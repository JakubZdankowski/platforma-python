import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import { CLASS_NAME_MAX, normalizeName } from '../auth/credentials';
import { createClass, listTeacherClasses, type ClassSummary } from '../classes/classService';
import type { Messages } from '../i18n/en';

type ClassesState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; classes: ClassSummary[] };

export function TeacherClassesPage({ messages: t }: { messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();
  const [state, setState] = useState<ClassesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void listTeacherClasses(client, profile.id).then((result) => {
      if (active) setState(result.ok ? { status: 'ready', classes: result.value } : { status: 'error' });
    });
    return () => { active = false; };
  }, [client, profile.id, attempt]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const className = normalizeName(name);
    if (!className) {
      setCreateError(t.classNameRequired);
      return;
    }
    setCreating(true);
    setCreateError(null);
    const result = await createClass(client, className);
    setCreating(false);
    if (result.ok) void navigate(`/teacher/classes/${result.value}`);
    else setCreateError(t.saveFailed);
  };

  return <main className="account-page">
    <h1>{t.teacherClassesTitle}</h1>
    <section className="account-section" aria-labelledby="teacher-classes-heading">
      <h2 id="teacher-classes-heading" className="sr-only">{t.teacherClassesTitle}</h2>
      {state.status === 'loading' && <p className="account-muted" role="status">{t.loadingData}</p>}
      {state.status === 'error' && <div className="form-error" role="alert">
        <p>{t.dataUnavailable}</p>
        <button type="button" className="button button-secondary button-small" onClick={() => setAttempt((value) => value + 1)}>{t.retry}</button>
      </div>}
      {state.status === 'ready' && (state.classes.length === 0
        ? <p className="account-muted">{t.noTeacherClasses}</p>
        : <table className="data-table">
          <thead><tr><th scope="col">{t.className}</th><th scope="col">{t.joinCode}</th><th scope="col">{t.studentCount}</th></tr></thead>
          <tbody>
            {state.classes.map((item) => <tr key={item.id}>
              <td><Link to={`/teacher/classes/${item.id}`}>{item.name}</Link></td>
              <td><code className="join-code">{item.joinCode}</code></td>
              <td>{item.studentCount}</td>
            </tr>)}
          </tbody>
        </table>)}
    </section>
    <section className="account-section" aria-labelledby="new-class-heading">
      <h2 id="new-class-heading">{t.newClass}</h2>
      <form className="form form-inline" onSubmit={(event) => void submit(event)} noValidate>
        <label className="field">
          <span>{t.className}</span>
          <input name="className" value={name} maxLength={CLASS_NAME_MAX} onChange={(event) => setName(event.target.value)} required />
        </label>
        <button type="submit" className="button button-primary" disabled={creating}>{t.createClass}</button>
      </form>
      {createError && <p className="form-error" role="alert">{createError}</p>}
    </section>
  </main>;
}
