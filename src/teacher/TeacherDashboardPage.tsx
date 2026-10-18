import { Link } from 'react-router';
import { useProfile } from '../auth/AuthProvider';
import { useStaffData } from '../staff/useStaffData';
import { Button } from '../app/ui/Button';
import { Notice } from '../app/ui/Patterns';
import type { AppSupabaseClient } from '../database/supabase';

async function loadGroups(client: AppSupabaseClient) {
  const result = await client.from('classes').select('id,name,class_members(count)').order('name');
  if (result.error) throw result.error;
  return result.data;
}

export function TeacherDashboardPage() {
  const profile = useProfile();
  const { data, error, reload } = useStaffData(loadGroups);
  return <main className="account-page classroom-home">
    <header className="classroom-hero">

      <div className="classroom-title-row"><div><h1>Cześć, {profile.displayName}!</h1></div>

      </div>
    </header>
    <div className="classroom-body">
      <section className="classroom-panel" aria-labelledby="dashboard-groups">
        <div className="classroom-panel-heading"><div><h2 id="dashboard-groups">Grupy</h2><p>Wybierz grupę, aby zobaczyć uczniów i obserwować ich pracę.</p></div></div>
        {error && <Notice tone="error">{error}<Button onClick={reload}>Ponów</Button></Notice>}
        {!data && !error && <p role="status">Wczytywanie grup…</p>}
        {data?.length === 0 && <div className="classroom-empty">Nie masz jeszcze przypisanych grup.</div>}
        {!!data?.length && <ul className="classroom-rows">{data.map(group => <li key={group.id}><Link to={`/teacher/classes/${group.id}`}><strong>{group.name}</strong><span>{group.class_members[0]?.count ?? 0} uczniów </span></Link></li>)}</ul>}
      </section>
      <Link to="/teacher/materials" className="classroom-panel classroom-panel-link" aria-labelledby="dashboard-materials"><div className="classroom-panel-heading"><div><h2 id="dashboard-materials">Materiały</h2><p>Przygotuj lekcje i ćwiczenia dla swoich uczniów.</p></div></div></Link>
    </div>
  </main>;
}
