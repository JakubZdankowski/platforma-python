import { GroupMeetingFields } from './GroupMeetingFields';
import { formatMeeting, meetingFromForm } from '../classes/groupMeeting';
import { GroupModules } from '../teacher/GroupModules';
import { pl } from '../i18n/pl';
import { Icon } from '../app/ui/Icon';
import { Notice, EmptyState } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useCallback, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useProfile } from '../auth/AuthProvider';
import type { AppSupabaseClient } from '../database/supabase';
import { useStaffData } from './useStaffData';
import { GroupRoster } from './GroupRoster';
import { StudentPasswordButton } from '../teacher/StudentPasswordButton';

async function loadGroups(client: AppSupabaseClient) {
  const r = await client.from('classes').select('id,name,meeting_day,meeting_time,class_members(count)').order('name');
  if (r.error) throw r.error;
  return r.data;
}
export function GroupsPage() {
  const admin = useProfile().role === 'admin', base = admin ? '/admin' : '/teacher';
  const { client, data, error, busy, mutate, reload } = useStaffData(loadGroups);
  const [name, setName] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  async function create(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setScheduleError(''); try { const meeting = meetingFromForm(new FormData(e.currentTarget)); if (await mutate(() => client.from('classes').insert({ name: name.trim(), ...meeting }))) setName(''); } catch (error) { setScheduleError((error as Error).message); } }
  return <main className="account-page classroom-home"><h1 className="sr-only">Grupy</h1><div className="classroom-body"><section className="classroom-panel" aria-labelledby="groups-list-title"><div className="classroom-panel-heading"><div><h2 id="groups-list-title">Twoje grupy</h2><p>Grupa to uczniowie uczący się razem w ustalonym terminie.</p></div>{admin && <a className="button button-primary" href="#new-group">Utwórz grupę +</a>}</div>{error && <Notice tone="error">{error}<Button onClick={reload}>Ponów</Button></Notice>}
    {!data && !error && <Notice>Wczytywanie…</Notice>}
    {!!data?.length && <ul className={`classroom-rows${admin ? "" : " teacher-group-cards"}`}>{data.map(g => <li key={g.id}><Link to={`${base}/classes/${g.id}`}><span><strong>{g.name}</strong><small className="group-meeting">{formatMeeting(g)}</small></span><span>Uczniowie: {g.class_members[0]?.count ?? 0} </span></Link></li>)}</ul>}
    {data?.length === 0 && <EmptyState title="Brak przypisanych grup.">{admin ? 'Utwórz pierwszą grupę w formularzu poniżej, a następnie przypisz uczniów i nauczycieli.' : 'Administrator musi przypisać Cię do grupy. Po przypisaniu zobaczysz tutaj jej uczniów i materiały.'}</EmptyState>}
    </section>{admin && <section className="classroom-panel" id="new-group"><h2>Nowa grupa</h2><form className="form form-inline" onSubmit={e => void create(e)}><label className="field">Nazwa grupy<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><GroupMeetingFields required /><Button variant="primary" disabled={busy}>Utwórz grupę</Button></form>{scheduleError && <Notice tone="error">{scheduleError}</Notice>}</section>}</div>
  </main>;
}
export function GroupPage() {
  const { classId = '' } = useParams();
  const [scheduleError, setScheduleError] = useState('');
  const [infoId, setInfoId] = useState<string | null>(null);
  const [groupFeedback, setGroupFeedback] = useState('');
  const [membershipFeedback, setMembershipFeedback] = useState('');
  const infoDialog = useRef<HTMLDialogElement>(null);
  const admin = useProfile().role === 'admin', base = admin ? '/admin' : '/teacher';
  const load = useCallback(async (client: AppSupabaseClient) => {
    const results = await Promise.all([
      client.from('classes').select('id,name,meeting_day,meeting_time').eq('id', classId).maybeSingle(),
      client.from('profiles').select('id,display_name,role,username').order('display_name'),
      client.from('class_members').select('student_id').eq('class_id', classId),
      client.from('class_teachers').select('teacher_id').eq('class_id', classId),
    ]);
    for (const r of results) if (r.error) throw r.error;
    return { group: results[0].data, users: results[1].data!, students: results[2].data!, teachers: results[3].data! };
  }, [classId]);
  const { client, data, error, busy, mutate, reload } = useStaffData(load);
  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setScheduleError('');
    try {
      const form = new FormData(event.currentTarget);
      const meeting = meetingFromForm(form);
      setGroupFeedback('Zapisywanie nazwy i terminu…');
      const saved = await mutate(() => client.from('classes').update({ name: String(form.get('name')).trim(), ...meeting }).eq('id', classId));
      setGroupFeedback(saved ? 'Zapisano nazwę i termin grupy.' : 'Nie zapisano nazwy i terminu. Spróbuj ponownie.');
    } catch (error) { setGroupFeedback(''); setScheduleError((error as Error).message); }
  }
  async function changeMembership(person: { id: string; display_name: string }, assigned: boolean, role: 'student' | 'teacher') {
    if (busy || !data || !admin) return;
    if (!assigned && !window.confirm(role === 'student'
      ? `Usunąć ucznia ${person.display_name} z tej grupy? Utraci dostęp nadany przez tę grupę. Inne przypisania i zapisane prace pozostaną zachowane.`
      : `Usunąć nauczyciela ${person.display_name} z tej grupy? Utraci dostęp do podglądu tej grupy. Jego konto i materiały pozostaną zachowane.`)) return;
    setMembershipFeedback('Zapisywanie przypisania…');
    const saved = role === 'student'
      ? await mutate(() => assigned ? client.from('class_members').insert({ class_id: classId, student_id: person.id }) : client.from('class_members').delete().eq('class_id', classId).eq('student_id', person.id), previous => ({ ...previous, students: assigned ? [...previous.students, { student_id: person.id }] : previous.students.filter(member => member.student_id !== person.id) }))
      : await mutate(() => assigned ? client.from('class_teachers').insert({ class_id: classId, teacher_id: person.id }) : client.from('class_teachers').delete().eq('class_id', classId).eq('teacher_id', person.id), previous => ({ ...previous, teachers: assigned ? [...previous.teachers, { teacher_id: person.id }] : previous.teachers.filter(member => member.teacher_id !== person.id) }));
    setMembershipFeedback(saved ? `${assigned ? 'Dodano do grupy' : 'Usunięto z grupy'}: ${person.display_name}.` : `Nie zapisano przypisania: ${person.display_name}. Przywrócono poprzedni stan. Spróbuj ponownie.`);
  }
  return <main className={`account-page group-detail-page${admin ? "" : " teacher-group-dashboard"}`}>
    {admin && <p className="student-back"><Link to={`${base}/groups`}>Grupy</Link></p>}
    {error && <Notice tone="error">{error}<Button onClick={reload}>Ponów</Button></Notice>}
    {!data && !error && <Notice>Wczytywanie…</Notice>}
    {data && !data.group && <Notice tone="error">Grupa nie istnieje lub nie masz do niej dostępu.</Notice>}
    {data?.group && <><header className="group-detail-heading"><div><h1>{data.group.name}</h1><p className="account-lead">{formatMeeting(data.group)}</p></div><Link className="button button-primary" to={`${base}/classes/${classId}/live`}>Podgląd pracy uczniów</Link></header>
      {admin && <section className="group-settings" aria-labelledby="group-settings-title">
        <h2 id="group-settings-title">Nazwa i termin</h2>
        <p className="account-muted">Zmiany nazwy i terminu zatwierdź przyciskiem „Zapisz grupę”.</p>
        <form onSubmit={event => void saveGroup(event)} key={classId}>
          <fieldset disabled={busy} className="module-editor-fields form form-inline" onChange={() => setGroupFeedback('Niezapisane zmiany nazwy lub terminu.')}>
            <legend className="sr-only">Nazwa i termin grupy</legend>
            <label className="field">Nazwa grupy<input name="name" required maxLength={80} defaultValue={data.group.name} /></label>
            <GroupMeetingFields value={data.group} />
            <Button variant="secondary">Zapisz grupę</Button>
          </fieldset>
        </form>
        {scheduleError && <Notice tone="error">{scheduleError}</Notice>}
        <p className="account-muted" role="status">{groupFeedback}</p>
      </section>}
      <div className="group-dashboard-grid">
        <GroupModules key={classId} client={client} classId={classId} messages={pl} />
        <div className="group-membership">
          {admin && <><p className="account-muted">Przypisania uczniów i nauczycieli zapisują się od razu. Usunięcie osoby wymaga potwierdzenia.</p><p role="status" className="group-membership-feedback">{membershipFeedback}</p></>}
          <fieldset disabled={busy} className="module-editor-fields">
            <legend className="sr-only">Osoby w grupie</legend>
            <GroupRoster title="Uczniowie" admin={admin}
              people={data.users.filter(user => user.role === 'student' && (admin || data.students.some(member => member.student_id === user.id)))}
              members={new Set(data.students.map(member => member.student_id))}
              onToggle={(person, assigned) => void changeMembership(person, assigned, 'student')}
              actions={admin ? person => <div className="group-student-actions"><Button size="compact" aria-label={`Informacje o uczniu: ${person.display_name}`} title="Informacje o uczniu" onClick={() => { setInfoId(person.id); infoDialog.current?.showModal(); }}><Icon kind="person" /></Button>{data.students.some(member => member.student_id === person.id) && <Link className="button button-secondary button-small" aria-label={`Podgląd pracy ucznia: ${person.display_name}`} title="Podgląd pracy ucznia" to={`${base}/classes/${classId}/live?student=${encodeURIComponent(person.id)}`}><Icon kind="eye" /><span>Podgląd pracy ucznia</span></Link>}</div> : person => <StudentPasswordButton key={`${classId}:${person.id}`} studentId={person.id} displayName={person.display_name} />} />
            {admin && <GroupRoster title="Nauczyciele" admin
              people={data.users.filter(user => user.role === 'teacher')}
              members={new Set(data.teachers.map(member => member.teacher_id))}
              onToggle={(person, assigned) => void changeMembership(person, assigned, 'teacher')} />}
          </fieldset>
        </div>
      </div>
    </>}
    <dialog ref={infoDialog} className="student-info-dialog" onClose={() => setInfoId(null)} aria-labelledby="student-info-title">
      <h2 id="student-info-title">Informacje o uczniu</h2>
      {data?.users.filter(u => u.id === infoId).map(u => <dl key={u.id}><dt>Imię i nazwisko</dt><dd>{u.display_name}</dd><dt>Nazwa użytkownika</dt><dd>{u.username}</dd><dt>Grupa</dt><dd>{data.group?.name}{!data.students.some(m => m.student_id === u.id) && ' (uczeń nieprzypisany)'}</dd></dl>)}
      <Button onClick={() => infoDialog.current?.close()}>Zamknij</Button>
    </dialog>
  </main>;
}
