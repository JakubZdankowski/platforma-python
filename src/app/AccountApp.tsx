import { Link, Route, Routes } from 'react-router';
import { AccountBar } from '../auth/AccountBar';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { AuthStatus, RequireRole } from '../auth/RequireRole';
import { HomePage } from './HomePage';
import { StudentLoginPage } from '../auth/StudentLoginPage';
import { TeacherLoginPage } from '../auth/TeacherLoginPage';
import { getSupabase } from '../database/supabase';
import type { Messages, Locale } from '../i18n/en';
import { StudentExercisePage } from '../student/StudentExercisePage';
import { StudentHomePage } from '../student/StudentHomePage';
import { ClassPage } from '../teacher/ClassPage';
import { TeacherClassesPage } from '../teacher/TeacherClassesPage';
import { TeacherLivePage } from '../teacher/TeacherLivePage';

/** Account area, loaded lazily from the start page. */
export default function AccountApp({ messages: t, locale, headerTarget }: { messages: Messages; locale: Locale; headerTarget: HTMLElement | null }) {
  const client = getSupabase();
  if (!client) {
    return <Routes><Route index element={<HomePage />} /><Route path="*" element={<main className="account-page account-narrow">
      <p className="form-error" role="alert">{t.backendNotConfigured}</p>
      <p><Link to="/">{t.homeLink}</Link></p>
    </main>} /></Routes>;
  }

  return <AuthProvider client={client}>
    <AccountBar messages={t} target={headerTarget} />
    <Routes>
      <Route index element={<SessionHome messages={t} />} />
      <Route path="join" element={<StudentLoginPage messages={t} />} />
      <Route path="login" element={<TeacherLoginPage messages={t} />} />
      <Route path="student" element={<RequireRole role="student" messages={t}><StudentHomePage messages={t} /></RequireRole>} />
      <Route path="student/exercises/:exerciseId" element={<RequireRole role="student" messages={t}><StudentExercisePage messages={t} locale={locale} /></RequireRole>} />
      <Route path="teacher" element={<RequireRole role="teacher" messages={t}><TeacherClassesPage messages={t} /></RequireRole>} />
      <Route path="teacher/classes/:classId" element={<RequireRole role="teacher" messages={t}><ClassPage messages={t} /></RequireRole>} />
      <Route path="teacher/classes/:classId/live" element={<RequireRole role="teacher" messages={t}><TeacherLivePage messages={t} locale={locale} /></RequireRole>} />
      <Route path="*" element={<NotFound messages={t} />} />
    </Routes>
  </AuthProvider>;
}

export function SessionHome({ messages }: { messages: Messages }) {
  const { state } = useAuth();
  if (state.status === 'signed-out') return <HomePage />;
  if (state.status === 'signed-in') return <HomePage profile={state.profile} />;
  return <AuthStatus messages={messages} />;
}

function NotFound({ messages: t }: { messages: Messages }) {
  return <main className="account-page account-narrow">
    <h1>{t.notFoundTitle}</h1>
    <p className="account-links"><Link to="/join">{t.studentLoginLink}</Link><Link to="/">{t.homeLink}</Link></p>
  </main>;
}
