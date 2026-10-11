import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
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
  const base = student ? '/student' : profile.role === 'admin' ? '/admin' : '/teacher';
  const links = student
    ? [[base, 'Pulpit', 'home'], [`${base}/materials`, 'Materiały', 'book'], [`${base}/help`, 'Pomoc', 'help']]
    : [[base, 'Pulpit', 'home'], [`${base}/groups`, 'Grupy', 'group'], [`${base}/students`, profile.role === 'admin' ? 'Konta' : 'Uczniowie', 'person'], [`${base}/materials`, 'Materiały', 'book'], ...(profile.role === 'admin' ? [[`${base}/modules`, 'Moduły i dostęp', 'book']] : [])];
  return <div className="dashboard-shell">
    <aside className="dashboard-sidebar">
      <nav aria-label={student ? 'Panel ucznia' : profile.role === 'admin' ? 'Panel administratora' : 'Panel nauczyciela'}>{links.map(([to, label, icon]) =>
        <Link key={to} to={to!} aria-current={(to === base ? pathname === base : pathname.startsWith(to!) || to === `${base}/groups` && pathname.startsWith(`${base}/classes/`)) ? 'page' : undefined} className="dashboard-nav">
          <Icon kind={icon!} /><span>{label}</span>
        </Link>)}</nav>
      <div className="dashboard-account"><p><strong>{profile.displayName}</strong></p><p className="account-muted">{student ? profile.username : profile.role === 'admin' ? 'Administrator' : 'Nauczyciel'}</p>
        <Button variant="quiet" disabled={leaving} onClick={() => { setLeaving(true); void signOut().finally(() => { setLeaving(false); void navigate(student ? '/join' : '/login'); }); }}>Wyloguj się</Button>
      </div>
    </aside>
    <div className="dashboard-content"><Outlet /></div>
  </div>;
}
