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
  return <main className="account-page"><h1>Panel administratora</h1><p className="account-lead">Użytkownicy, grupy i materiały całej platformy.</p>
    {error && <p role="alert">{error}<button onClick={reload}>Ponów</button></p>}
    {!data && !error && <p role="status">Wczytywanie statystyk…</p>}
    {data && <div className="staff-stats">{Object.entries({ 'Nauczyciele': data.teachers, 'Uczniowie': data.students, 'Grupy': data.groups, 'Materiały do zatwierdzenia': data.pending, 'Zapisane prace': data.work, 'Ukończone zadania': data.completed, 'Prace z ostatnim poprawnym uruchomieniem': data.successful }).map(([label, value]) => <div className="account-section" key={label}><strong>{value}</strong><p>{label}</p></div>)}</div>}
    <div className="teacher-dashboard-links"><Link to="/admin/students"><h2>Konta</h2><p>Twórz i edytuj konta nauczycieli oraz uczniów.</p></Link><Link to="/admin/groups"><h2>Grupy</h2><p>Przypisuj uczniów i nauczycieli.</p></Link><Link to="/admin/materials"><h2>Materiały</h2><p>Twórz lekcje i zatwierdzaj zgłoszenia.</p></Link></div>
  </main>;
}
