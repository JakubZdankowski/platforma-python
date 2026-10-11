import { Link } from 'react-router';
import type { AppSupabaseClient } from '../database/supabase';
import { useStaffData } from './useStaffData';
async function load(client: AppSupabaseClient) {
  const results = await Promise.all([
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    client.from('classes').select('*', { count: 'exact', head: true }),
    client.from('lessons').select('id', { count: 'exact', head: true }).eq('publication_status', 'pending'),
    client.from('student_work').select('student_id', { count: 'exact', head: true }),
    client.from('student_work').select('student_id', { count: 'exact', head: true }).eq('status', 'completed'),
    client.from('student_work').select('student_id', { count: 'exact', head: true }).eq('last_run_success', true),
  ]);
  for (const r of results) if (r.error) throw r.error;
  return { teachers: results[0].count ?? 0, students: results[1].count ?? 0,
    groups: results[2].count ?? 0, pending: results[3].count ?? 0,
    work: results[4].count ?? 0, completed: results[5].count ?? 0, successful: results[6].count ?? 0 };
}
export function AdminDashboardPage() {
  const { data, error, reload } = useStaffData(load);
  return <main className="account-page admin-dashboard">
    <header className="admin-dashboard-header"><h1>Panel administratora</h1><p className="account-lead">Zarządzaj platformą i sprawdzaj postępy uczniów.</p></header>
    {error && <p className="form-error" role="alert">{error} <button className="button button-secondary button-small" onClick={reload}>Ponów</button></p>}
    {!data && !error && <p role="status">Wczytywanie statystyk…</p>}
    {data && <>
      <section className="admin-dashboard-section" aria-labelledby="admin-overview-title">
        <h2 id="admin-overview-title">Platforma w liczbach</h2>
        <dl className="admin-overview-grid">
          {[['Nauczyciele', data.teachers], ['Uczniowie', data.students], ['Grupy', data.groups]].map(([label, value]) => <div className="admin-stat" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          <div className={`admin-stat admin-stat-review${data.pending > 0 ? ' has-pending' : ''}`}><dt>Do zatwierdzenia</dt><dd>{data.pending}</dd><Link to="/admin/materials">Przejdź do materiałów <span aria-hidden="true">→</span></Link></div>
        </dl>
      </section>
      <section className="admin-dashboard-section" aria-labelledby="admin-progress-title">
        <h2 id="admin-progress-title">Prace uczniów</h2>
        <dl className="admin-progress-grid">
          <div className="admin-stat"><dt>Zapisane prace</dt><dd>{data.work}</dd><p>Ćwiczenia z zapisanym kodem</p></div>
          <div className="admin-stat"><dt>Ukończone zadania</dt><dd>{data.completed}</dd><p>Oznaczone przez uczniów jako ukończone</p></div>
          <div className="admin-stat"><dt>Poprawne uruchomienia</dt><dd>{data.successful}</dd><p>Prace, których ostatnie uruchomienie było poprawne</p></div>
        </dl>
      </section>
    </>}
    <section className="admin-dashboard-section" aria-labelledby="admin-actions-title">
      <h2 id="admin-actions-title">Zarządzanie</h2>
      <div className="admin-actions-grid">
        <Link to="/admin/students"><div className="admin-action-title"><h3>Konta</h3><span aria-hidden="true">→</span></div><p>Twórz i edytuj konta nauczycieli oraz uczniów.</p></Link>
        <Link to="/admin/groups"><div className="admin-action-title"><h3>Grupy</h3><span aria-hidden="true">→</span></div><p>Przypisuj uczniów i nauczycieli do grup.</p></Link>
        <Link to="/admin/materials"><div className="admin-action-title"><h3>Materiały</h3><span aria-hidden="true">→</span></div><p>Twórz lekcje i zatwierdzaj zgłoszenia.</p></Link>
      </div>
    </section>
  </main>;
}
