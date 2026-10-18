import { Notice, EmptyState } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import { listModules, type ModuleSummary } from '../modules/moduleService';
import type { Messages } from '../i18n/en';

export function TeacherModulesPage({ messages: t }: { messages: Messages }) {
  const { client } = useAuth();
  const navigate = useNavigate();
  const admin = useProfile().role === 'admin';
  const base = admin ? '/admin' : '/teacher';
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
      void navigate(`${base}/modules/${result.data.id}`);
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <main className="account-page"><h1>Moduły</h1><p className="account-lead">Moduł to zbiór lekcji. Ten sam moduł możesz przypisać do wielu grup.</p>
    {error && <div className="form-error" role="alert">{t.dataUnavailable}<Button variant="secondary" onClick={() => setAttempt((v) => v + 1)}>{t.retry}</Button></div>}
    {!modules && !error && <Notice>{t.loadingData}</Notice>}
    {modules && <div className="materials-list">{modules.length ? modules.map((m) => <Link className="material-link" key={m.id} to={`${base}/modules/${m.id}`}><span>{m.title}</span></Link>) : <EmptyState title="Nie masz jeszcze modułów.">{admin ? 'Utwórz pierwszy poniżej.' : 'Moduły pojawią się po przypisaniu do Twojej grupy.'}</EmptyState>}</div>}
    {admin && <section className="account-section"><h2>Nowy moduł</h2><form className="form form-inline" onSubmit={(e) => void create(e)}><label className="field">Nazwa modułu<input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. 1. Podstawy Pythona" /></label><Button variant="primary" disabled={busy || !modules}>Utwórz moduł</Button></form></section>}
  </main>;
}
