import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import type { AppSupabaseClient } from '../database/supabase';
import type { Messages } from '../i18n/en';

async function load(client: AppSupabaseClient, moduleId: string, teacherId: string) {
  const results = await Promise.all([
    client.from('modules').select('id, title, position').eq('id', moduleId).maybeSingle(),
    client.from('lessons').select('id, title, position').order('position').order('slug'),
    client.from('module_lessons').select('lesson_id, position').eq('module_id', moduleId),
    client.from('classes').select('id, name').order('name'),
    client.from('group_module_assignments').select('class_id').eq('module_id', moduleId),
    client.from('profiles').select('id, display_name, username').eq('created_by', teacherId).eq('role', 'student').order('display_name'),
    client.from('student_module_assignments').select('student_id').eq('module_id', moduleId),
  ]);
  for (const r of results) if (r.error) throw r.error;
  return { module: results[0].data, lessons: results[1].data!, links: results[2].data!, groups: results[3].data!, assignedGroups: results[4].data!, students: results[5].data!, assignedStudents: results[6].data! };
}

export function TeacherModulePage({ messages: t }: { messages: Messages }) {
  const { moduleId = '' } = useParams();
  return <ModuleEditor key={moduleId} moduleId={moduleId} messages={t} />;
}

function ModuleEditor({ moduleId, messages: t }: { moduleId: string; messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    setError(null);
    void load(client, moduleId, profile.id).then((r) => { if (active) setData(r); }).catch(() => { if (active) setError(t.dataUnavailable); });
    return () => { active = false; };
  }, [client, moduleId, profile.id, attempt, t.dataUnavailable]);

  async function mutate(action: () => PromiseLike<{ error: unknown }>, optimistic?: (previous: NonNullable<typeof data>) => NonNullable<typeof data>) {
    const previous = data;
    if (data && optimistic) setData(optimistic(data));
    setBusy(true); setError(null); setSaved(false);
    try {
      const r = await action();
      if (r.error) throw r.error;
      setData(await load(client, moduleId, profile.id));
      setSaved(true);
    } catch { setData(previous); setError(t.saveFailed); } finally { setBusy(false); }
  }
  function confirmRemoval(checked: boolean) {
    return checked || window.confirm('Cofnąć dostęp do tych materiałów? Uczeń może stracić możliwość dalszego zapisu. Dotychczasowe prace pozostaną zachowane.');
  }
  function saveModule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title')).trim();
    const position = Number(form.get('position'));
    if (!title || !Number.isSafeInteger(position) || position < 0 || position > 1000000) return;
    void mutate(() => client.from('modules').update({ title, position }).eq('id', moduleId));
  }
  return <main className="account-page"><p className="student-back"><Link to="/teacher/materials">← Materiały</Link></p>
    {error && <div className="form-error" role="alert">{error}<button className="button button-secondary" onClick={() => setAttempt((v) => v + 1)}>{t.retry}</button></div>}
    {!data && !error && <p role="status">{t.loadingData}</p>}
    {data && !data.module && <p role="alert">Ten moduł nie istnieje lub nie masz do niego dostępu.</p>}
    {data?.module && <><h1>{data.module.title}</h1><p className="account-lead">Zawartość modułu i dostęp uczniów</p>
      <fieldset className="module-editor-fields" disabled={busy}>
        <form className="form form-inline" key={`${data.module.title}-${data.module.position}`} onSubmit={saveModule}>
          <label className="field">Nazwa modułu<input name="title" defaultValue={data.module.title} maxLength={200} required /></label>
          <label className="field">Kolejność<input name="position" type="number" min="0" max="1000000" step="1" defaultValue={data.module.position} required /></label>
          <button className="button button-secondary">Zapisz moduł</button>
        </form>
        <p className="account-muted" role="status">{busy ? 'Zapisywanie…' : saved ? 'Zapisano' : ''}</p>
        <section className="account-section"><h2>Lekcje w module</h2>
          {!data.lessons.length && <p className="account-muted">{t.noTeacherLessons}</p>}
          <ul className="module-checklist">{data.lessons.map((lesson) => {
            const link = data.links.find((l) => l.lesson_id === lesson.id);
            return <li key={lesson.id}><label><input type="checkbox" checked={!!link} onChange={(e) => {
              const checked = e.target.checked;
              if (!confirmRemoval(checked)) return;
              void mutate(() => checked ? client.from('module_lessons').insert({ module_id: moduleId, lesson_id: lesson.id, position: lesson.position }) : client.from('module_lessons').delete().eq('module_id', moduleId).eq('lesson_id', lesson.id), (prev) => ({ ...prev, links: checked ? [...prev.links, { lesson_id: lesson.id, position: lesson.position }] : prev.links.filter((l) => l.lesson_id !== lesson.id) }));
            }} />{lesson.title}</label>
            {link && <form className="lesson-order" onSubmit={(e) => {
              e.preventDefault(); const position = Number(new FormData(e.currentTarget).get('position'));
              if (Number.isSafeInteger(position) && position >= 0 && position <= 1000000) void mutate(() => client.from('module_lessons').update({ position }).eq('module_id', moduleId).eq('lesson_id', lesson.id));
            }}><label>Kolejność<input key={link.position} type="number" name="position" min="0" max="1000000" step="1" defaultValue={link.position} required aria-label={`Kolejność: ${lesson.title}`} /></label><button className="button button-secondary button-small">Zapisz kolejność</button></form>}</li>;
          })}</ul>
        </section>
        <section className="account-section"><h2>Udostępnij grupom</h2><p className="account-muted">Dostęp otrzymają obecni i przyszli członkowie zaznaczonych grup.</p>
          {!data.groups.length && <p>Nie masz jeszcze grup. <Link to="/teacher/groups">Utwórz grupę</Link></p>}
          <ul className="module-checklist">{data.groups.map((group) => <li key={group.id}><label><input type="checkbox" checked={data.assignedGroups.some((g) => g.class_id === group.id)} onChange={(e) => {
            const checked = e.target.checked; if (!confirmRemoval(checked)) return;
            void mutate(() => checked ? client.from('group_module_assignments').insert({ module_id: moduleId, class_id: group.id }) : client.from('group_module_assignments').delete().eq('module_id', moduleId).eq('class_id', group.id), (prev) => ({ ...prev, assignedGroups: checked ? [...prev.assignedGroups, { class_id: group.id }] : prev.assignedGroups.filter((g) => g.class_id !== group.id) }));
          }} />{group.name}</label></li>)}</ul>
        </section>
        <section className="account-section"><h2>Udostępnij indywidualnie</h2><p className="account-muted">Dodatkowy dostęp niezależny od grup. Odznaczenie nie odbiera dostępu uzyskanego przez grupę.</p>
          {!data.students.length && <p>Nie masz jeszcze uczniów. <Link to="/teacher/students">Utwórz konto ucznia</Link></p>}
          <ul className="module-checklist">{data.students.map((s) => <li key={s.id}><label><input type="checkbox" checked={data.assignedStudents.some((a) => a.student_id === s.id)} onChange={(e) => {
            const checked = e.target.checked; if (!confirmRemoval(checked)) return;
            void mutate(() => checked ? client.from('student_module_assignments').insert({ module_id: moduleId, student_id: s.id }) : client.from('student_module_assignments').delete().eq('module_id', moduleId).eq('student_id', s.id), (prev) => ({ ...prev, assignedStudents: checked ? [...prev.assignedStudents, { student_id: s.id }] : prev.assignedStudents.filter((a) => a.student_id !== s.id) }));
          }} /><span>{s.display_name} <small className="account-muted">({s.username})</small></span></label></li>)}</ul>
        </section>
      </fieldset>
    </>}
  </main>;
}
