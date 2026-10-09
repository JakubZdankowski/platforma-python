import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AppSupabaseClient } from '../database/supabase';
import type { Messages } from '../i18n/en';
import { listModules, type ModuleSummary } from '../modules/moduleService';

export function GroupModules({ client, classId, messages: t }: { client: AppSupabaseClient; classId: string; messages: Messages }) {
  const [data, setData] = useState<{ modules: ModuleSummary[]; assigned: Set<string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    void Promise.all([listModules(client), client.from('group_module_assignments').select('module_id').eq('class_id', classId)]).then(([modules, links]) => {
      if (links.error) throw links.error;
      if (active) setData({ modules, assigned: new Set(links.data.map((l) => l.module_id)) });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [client, classId, attempt]);
  async function toggle(moduleId: string, checked: boolean) {
    if (!checked && !window.confirm('Odpiąć moduł od tej grupy? Zapisane prace pozostaną zachowane.')) return;
    const previous = data;
    setData((prev) => { if (!prev) return prev; const assigned = new Set(prev.assigned); if (checked) assigned.add(moduleId); else assigned.delete(moduleId); return { ...prev, assigned }; });
    setBusy(true); setError(false);
    try {
      const r = checked ? await client.from('group_module_assignments').insert({ class_id: classId, module_id: moduleId }) : await client.from('group_module_assignments').delete().eq('class_id', classId).eq('module_id', moduleId);
      if (r.error) throw r.error;
      setData((prev) => { if (!prev) return prev; const assigned = new Set(prev.assigned); if (checked) assigned.add(moduleId); else assigned.delete(moduleId); return { ...prev, assigned }; });
    } catch { setData(previous); setError(true); } finally { setBusy(false); }
  }
  return <section className="account-section"><h2>Materiały grupy</h2>
    {error && <div className="form-error" role="alert">{t.dataUnavailable}<button className="button button-secondary" onClick={() => setAttempt((v) => v + 1)}>{t.retry}</button></div>}
    {!data && !error && <p role="status">{t.loadingData}</p>}
    {data && (data.modules.length ? <ul className="module-checklist">{data.modules.map((m) => <li key={m.id}><label><input type="checkbox" checked={data.assigned.has(m.id)} disabled={busy} onChange={(e) => void toggle(m.id, e.target.checked)} />{m.title}</label><Link to={`/teacher/materials/${m.id}`}>Edytuj moduł</Link></li>)}</ul> : <p>Brak modułów. <Link to="/teacher/materials">Przejdź do materiałów</Link></p>)}
  </section>;
}
