import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { listModules, type ModuleSummary } from '../modules/moduleService';
import type { Messages } from '../i18n/en';

export function TeacherModulesPage({ messages: t }: { messages: Messages }) {
  const { client } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    void listModules(client).then((r) => { if (active) setModules(r); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [client, attempt]);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !modules) return;
    setBusy(true); setError(false);
    try {
      const result = await client.from('modules').insert({ title: title.trim(), position: Math.max(-1, ...modules.map((m) => m.position)) + 1 }).select('id').single();
      if (result.error) throw result.error;
      void navigate(`/teacher/materials/${result.data.id}`);
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <main className="account-page"><h1>Materiały</h1><p className="account-lead">Układaj lekcje w moduły i udostępniaj je grupom lub wybranym uczniom.</p>
    {error && <div className="form-error" role="alert">{t.dataUnavailable}<button className="button button-secondary" onClick={() => setAttempt((v) => v + 1)}>{t.retry}</button></div>}
    {!modules && !error && <p role="status">{t.loadingData}</p>}
    {modules && <div className="materials-list">{modules.length ? modules.map((m) => <Link className="material-link" key={m.id} to={`/teacher/materials/${m.id}`}><span>{m.title}</span><span aria-hidden="true">→</span></Link>) : <p className="account-muted">Nie masz jeszcze modułów. Utwórz pierwszy poniżej.</p>}</div>}
    <section className="account-section"><h2>Nowy moduł</h2><form className="form form-inline" onSubmit={(e) => void create(e)}><label className="field">Nazwa modułu<input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. 1. Podstawy Pythona" /></label><button className="button button-primary" disabled={busy || !modules}>Utwórz moduł</button></form></section>
  </main>;
}
