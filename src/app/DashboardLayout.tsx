import { Icon } from './ui/Icon';
import { Link, Outlet, useLocation } from 'react-router';
import { useProfile } from '../auth/AuthProvider';

export function DashboardLayout() {
  const profile = useProfile();
  const { pathname } = useLocation();
  const student = profile.role === 'student';
  const base = student ? '/student' : profile.role === 'admin' ? '/admin' : '/teacher';
  const links = student
    ? [[`${base}/help`, 'Pomoc', 'help']]
    : [[base, 'Pulpit', 'home'], ...(profile.role === 'admin' ? [[`${base}/groups`, 'Grupy', 'group'], [`${base}/students`, 'Konta', 'person']] : []), [`${base}/materials`, 'Materiały', 'book'], ...(profile.role === 'admin' ? [[`${base}/modules`, 'Moduły', 'book']] : [])];
  return <div className="dashboard-shell classroom-dashboard">
    {!student && <header className="dashboard-sidebar">
      <nav aria-label={student ? 'Panel ucznia' : profile.role === 'admin' ? 'Panel administratora' : 'Panel nauczyciela'}>{links.map(([to, label, icon]) =>
        <Link key={to} to={to!} aria-current={(to === base ? pathname === base || profile.role === 'teacher' && (pathname.startsWith(`${base}/classes/`) || pathname === `${base}/groups`) : pathname.startsWith(to!) || profile.role === 'teacher' && to === `${base}/materials` && pathname.startsWith(`${base}/modules`) || to === `${base}/groups` && pathname.startsWith(`${base}/classes/`)) ? 'page' : undefined} className="dashboard-nav">
          <Icon kind={icon!} /><span>{label}</span>
        </Link>)}</nav>
    </header>}
    <div className="dashboard-content"><Outlet /></div>
  </div>;
}
