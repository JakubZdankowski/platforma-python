import { Link } from 'react-router';
import { useProfile } from '../auth/AuthProvider';

export function TeacherDashboardPage() {
  const profile = useProfile();
  return <main className="account-page"><h1>Cześć, {profile.displayName}!</h1><p className="account-lead">Przygotuj materiały i otwórz podgląd pracy swojej grupy.</p>
    <div className="teacher-dashboard-links">
      <Link to="/teacher/groups"><h2>Grupy</h2><p>Organizuj uczniów i obserwuj ich pracę podczas zajęć.</p><span>Otwórz grupy →</span></Link>
      <Link to="/teacher/students"><h2>Uczniowie</h2><p>Twórz niezależne konta i zarządzaj hasłami.</p><span>Otwórz uczniów →</span></Link>
      <Link to="/teacher/materials"><h2>Materiały</h2><p>Układaj moduły i udostępniaj je grupom lub pojedynczym uczniom.</p><span>Otwórz materiały →</span></Link>
    </div>
  </main>;
}
