import { useProfile } from '../auth/AuthProvider';
import { Notice } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { AppSupabaseClient } from '../database/supabase';
import type { Messages } from '../i18n/en';

type CatalogModule = { id: string; title: string; position: number; lesson_count: number };

export function GroupModules({ client, classId, messages: t }: { client: AppSupabaseClient; classId: string; messages: Messages }) {
  const base = useProfile().role === 'admin' ? '/admin' : '/teacher';
  const [data, setData] = useState<{ modules: CatalogModule[]; assigned: Set<string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    setData(null);
    void Promise.all([client.rpc('group_module_catalog', { p_class_id: classId }), client.from('group_module_assignments').select('module_id').eq('class_id', classId)]).then(([catalog, links]) => {
      if (catalog.error || links.error) throw catalog.error ?? links.error;
      if (active) setData({ modules: catalog.data, assigned: new Set(links.data.map(l => l.module_id)) });
    }).catch(() => { if (active) setError(t.dataUnavailable); });
    return () => { active = false; };
  }, [client, classId, attempt, t.dataUnavailable]);

  async function toggle(moduleId: string, assign: boolean) {
    if (busy || !data) return;
    if (!assign && !window.confirm('Usunąć moduł z tej grupy? Lekcje i zapisane prace pozostaną zachowane.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = assign
        ? await client.from('group_module_assignments').insert({ class_id: classId, module_id: moduleId }).select('module_id').single()
        : await client.from('group_module_assignments').delete().eq('class_id', classId).eq('module_id', moduleId).select('module_id').single();
      if (result.error || !result.data) throw result.error ?? new Error('No assignment changed');
      setData(previous => {
        if (!previous) return previous;
        const assigned = new Set(previous.assigned);
        if (assign) assigned.add(moduleId); else assigned.delete(moduleId);
        return { ...previous, assigned };
      });
      setSelected('');
      setNotice(assign ? 'Dodano moduł do grupy.' : 'Usunięto moduł z grupy.');
    } catch { setError('Nie udało się zmienić przypisania modułu. Spróbuj ponownie.'); }
    finally { setBusy(false); }
  }
  function add(event: FormEvent) { event.preventDefault(); if (selected) void toggle(selected, true); }
  const available = data?.modules.filter(m => !data.assigned.has(m.id)) ?? [];
  return <section className="account-section group-modules-panel" aria-labelledby="group-modules-title">
    <div className="classroom-panel-heading"><div><h2 id="group-modules-title">Moduły grupy{data && <span className="group-count">{data.assigned.size}</span>}</h2><p>Wybierz materiały, które realizuje ta grupa.</p></div></div>
    {error && <Notice tone="error">{error}{!data && <Button variant="secondary" onClick={() => setAttempt(v => v + 1)}>{t.retry}</Button>}</Notice>}
    {!data && !error && <Notice>{t.loadingData}</Notice>}
    {data && <>
      {data.assigned.size ? <ul className="group-module-cards">{data.modules.filter(m => data.assigned.has(m.id)).map(m => <li key={m.id}>
        <Link className="group-module-content" aria-label={m.title} to={`${base}/modules/${m.id}`}><strong>{m.title}</strong><span>Liczba lekcji: {m.lesson_count}</span></Link>
        <Button variant="quiet" size="compact" disabled={busy} aria-label={`Usuń z grupy: ${m.title}`} onClick={() => void toggle(m.id, false)}>Usuń z grupy</Button>
      </li>)}</ul> : <div className="classroom-empty">Nie przypisano jeszcze modułów do tej grupy.</div>}
      <form className="group-add-module form" onSubmit={add}>
        <label className="field">Dodaj moduł<select aria-label="Dodaj moduł" value={selected} disabled={busy || !available.length} onChange={e => setSelected(e.target.value)}><option value="">{available.length ? 'Wybierz moduł' : 'Brak kolejnych modułów'}</option>{available.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
        <Button variant="primary" disabled={busy || !selected}>Dodaj do grupy</Button>
      </form>
      <p className="account-muted group-module-help">Odpięcie modułu nie usuwa lekcji ani zapisanych prac uczniów.</p>
      <p className="account-muted" role="status">{busy ? 'Zapisywanie…' : notice}</p>
    </>}
  </section>;
}
