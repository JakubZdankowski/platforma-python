import { useCallback, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useProfile } from '../auth/AuthProvider';
import type { AppSupabaseClient } from '../database/supabase';
import { useStaffData } from './useStaffData';

async function loadGroups(client: AppSupabaseClient) {
  const r = await client.from('classes').select('id,name,class_members(count)').order('name');
  if (r.error) throw r.error;
  return r.data;
}
export function GroupsPage() {
  const admin = useProfile().role === 'admin', base = admin ? '/admin' : '/teacher';
  const { client, data, error, busy, mutate, reload } = useStaffData(loadGroups);
  const [name, setName] = useState('');
  async function create(e: FormEvent) { e.preventDefault(); if (await mutate(() => client.from('classes').insert({ name: name.trim() }))) setName(''); }
  return <main className="account-page"><h1>Grupy</h1>{error && <p role="alert">{error}<button onClick={reload}>Ponów</button></p>}
    {!data && !error && <p role="status">Wczytywanie…</p>}
    {data && <table className="data-table"><thead><tr><th>Grupa</th><th>Uczniowie</th></tr></thead><tbody>{data.map(g => <tr key={g.id}><td><Link to={`${base}/classes/${g.id}`}>{g.name}</Link></td><td>{g.class_members[0]?.count ?? 0}</td></tr>)}</tbody></table>}
    {data?.length === 0 && <p>Brak przypisanych grup.</p>}
    {admin && <section className="account-section"><h2>Nowa grupa</h2><form className="form form-inline" onSubmit={e => void create(e)}><label className="field">Nazwa grupy<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><button className="button button-primary" disabled={busy}>Utwórz grupę</button></form></section>}
  </main>;
}
export function GroupPage() {
  const { classId = '' } = useParams();
  const admin = useProfile().role === 'admin', base = admin ? '/admin' : '/teacher';
  const load = useCallback(async (client: AppSupabaseClient) => {
    const results = await Promise.all([
      client.from('classes').select('id,name').eq('id', classId).maybeSingle(),
      client.from('profiles').select('id,display_name,role,username').order('display_name'),
      client.from('class_members').select('student_id').eq('class_id', classId),
      client.from('class_teachers').select('teacher_id').eq('class_id', classId),
    ]);
    for (const r of results) if (r.error) throw r.error;
    return { group: results[0].data, users: results[1].data!, students: results[2].data!, teachers: results[3].data! };
  }, [classId]);
  const { client, data, error, busy, mutate, reload } = useStaffData(load);
  return <main className="account-page"><Link to={`${base}/groups`}>← Grupy</Link>
    {error && <p className="form-error" role="alert">{error}<button onClick={reload}>Ponów</button></p>}
    {!data && !error && <p role="status">Wczytywanie…</p>}
    {data && !data.group && <p role="alert">Grupa nie istnieje lub nie masz do niej dostępu.</p>}
    {data?.group && <><h1>{data.group.name}</h1><p><Link to={`${base}/classes/${classId}/live`}>Podgląd pracy klasy →</Link></p>
      {admin && <form className="form form-inline" key={data.group.name} onSubmit={e => { e.preventDefault(); void mutate(() => client.from('classes').update({ name: String(new FormData(e.currentTarget).get('name')).trim() }).eq('id', classId)); }}><label className="field">Nazwa grupy<input name="name" required maxLength={80} defaultValue={data.group.name} /></label><button disabled={busy} className="button button-secondary">Zapisz nazwę</button></form>}
      <fieldset disabled={busy} className="module-editor-fields"><section className="account-section"><h2>Uczniowie</h2><ul className="module-checklist">{data.users.filter(u => u.role === 'student' && (admin || data.students.some(m => m.student_id === u.id))).map(u => <li key={u.id}>{admin ? <label><input type="checkbox" checked={data.students.some(m => m.student_id === u.id)} onChange={e => { const checked = e.target.checked; void mutate(() => checked ? client.from('class_members').insert({ class_id: classId, student_id: u.id }) : client.from('class_members').delete().eq('class_id', classId).eq('student_id', u.id), previous => ({ ...previous, students: checked ? [...previous.students, { student_id: u.id }] : previous.students.filter(m => m.student_id !== u.id) })); }} />{u.display_name} ({u.username})</label> : `${u.display_name} (${u.username})`}</li>)}</ul></section>
      {admin && <section className="account-section"><h2>Nauczyciele</h2><ul className="module-checklist">{data.users.filter(u => u.role === 'teacher').map(u => <li key={u.id}><label><input type="checkbox" checked={data.teachers.some(t => t.teacher_id === u.id)} onChange={e => { const checked = e.target.checked; void mutate(() => checked ? client.from('class_teachers').insert({ class_id: classId, teacher_id: u.id }) : client.from('class_teachers').delete().eq('class_id', classId).eq('teacher_id', u.id), previous => ({ ...previous, teachers: checked ? [...previous.teachers, { teacher_id: u.id }] : previous.teachers.filter(t => t.teacher_id !== u.id) })); }} />{u.display_name}</label></li>)}</ul></section>}</fieldset>
    </>}
  </main>;
}
