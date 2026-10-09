import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import { useState } from 'react';

export function DashboardLayout() {
  const profile = useProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [leaving, setLeaving] = useState(false);
  const student = profile.role === 'student';
  const base = student ? '/student' : '/teacher';
  const links = student
    ? [[base, 'Pulpit', 'home'], [`${base}/materials`, 'Materiały', 'book'], [`${base}/help`, 'Pomoc', 'help']]
    : [[base, 'Pulpit', 'home'], [`${base}/groups`, 'Grupy', 'group'], [`${base}/students`, 'Uczniowie', 'person'], [`${base}/materials`, 'Materiały', 'book']];
  return <div className="dashboard-shell">
    <aside className="dashboard-sidebar">
      <nav aria-label={student ? 'Panel ucznia' : 'Panel nauczyciela'}>{links.map(([to, label, icon]) =>
        <Link key={to} to={to!} aria-current={(to === base ? pathname === base : pathname.startsWith(to!) || to === '/teacher/groups' && pathname.startsWith('/teacher/classes/')) ? 'page' : undefined} className="dashboard-nav">
          <SidebarIcon kind={icon!} /><span>{label}</span>
        </Link>)}</nav>
      <div className="dashboard-account"><p><strong>{profile.displayName}</strong></p><p className="account-muted">{student ? profile.username : 'Nauczyciel'}</p>
        <button className="button button-quiet" disabled={leaving} onClick={() => { setLeaving(true); void signOut().finally(() => { setLeaving(false); void navigate(student ? '/join' : '/login'); }); }}>Wyloguj się</button>
      </div>
    </aside>
    <div className="dashboard-content"><Outlet /></div>
  </div>;
}

function SidebarIcon({ kind }: { kind: string }) {
  const paths: Record<string, string> = {
    home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    book: 'M12 5v16M3 4h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z',
    help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17v.01',
    group: 'M2 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3M17 14a4 4 0 0 1 5 4v3M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 3a4 4 0 0 1 0 8',
    person: 'M4 21v-3a8 8 0 0 1 16 0v3M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  };
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{kind === 'help' && <circle cx="12" cy="12" r="10" />}<path d={paths[kind]} /></svg>;
}
