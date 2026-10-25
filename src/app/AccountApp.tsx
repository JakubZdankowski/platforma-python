import { Link, Route, Routes } from 'react-router';
import { AccountBar, HeaderSignIn } from '../auth/AccountBar';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { AuthStatus, RequireRole } from '../auth/RequireRole';
import { LoginChoicePage } from '../auth/LoginChoicePage';
import { StudentLoginPage } from '../auth/StudentLoginPage';
import { TeacherLoginPage } from '../auth/TeacherLoginPage';
import { getSupabase } from '../database/supabase';
import type { Messages, Locale } from '../i18n/en';
import { StudentExercisePage } from '../student/StudentExercisePage';
import { StudentHelpPage, StudentHomePage } from '../student/StudentHomePage';
import { GroupPage, GroupsPage } from '../staff/GroupsPage';
import { AccountsPage } from '../staff/AccountsPage';
import { MaterialsPage } from '../staff/MaterialsPage';
import { MaterialEditorPage } from '../staff/MaterialEditorPage';
import { AdminDashboardPage } from '../staff/AdminDashboardPage';
import { TeacherLivePage } from '../teacher/TeacherLivePage';
import { DashboardLayout } from './DashboardLayout';
import { TeacherDashboardPage } from '../teacher/TeacherDashboardPage';
import { TeacherModulesPage } from '../teacher/TeacherModulesPage';
import { TeacherModulePage } from '../teacher/TeacherModulePage';

/** Account area, loaded lazily from the start page. */
export default function AccountApp({ messages: t, locale, headerTarget }: { messages: Messages; locale: Locale; headerTarget: HTMLElement | null }) {
  const client = getSupabase();
  if (!client) {
    return <><HeaderSignIn target={headerTarget} label={t.signIn} /><Routes><Route index element={<LoginChoicePage />} /><Route path="*" element={<main className="account-page account-narrow">
      <p className="form-error" role="alert">{t.backendNotConfigured}</p>
      <p><Link to="/">{t.homeLink}</Link></p>
    </main>} /></Routes></>;
  }

  return <AuthProvider client={client}>
    <AccountBar messages={t} target={headerTarget} />
    <Routes>
      <Route index element={<SessionHome messages={t} />} />
      <Route path="join" element={<StudentLoginPage messages={t} />} />
      <Route path="login" element={<TeacherLoginPage messages={t} />} />
      <Route path="student" element={<RequireRole role="student" messages={t}><DashboardLayout /></RequireRole>}>
        <Route index element={<StudentHomePage messages={t} />} />
        <Route path="materials" element={<StudentHomePage messages={t} materials />} />
        <Route path="help" element={<StudentHelpPage />} />
      </Route>
      <Route path="student/exercises/:exerciseId" element={<RequireRole role="student" messages={t}><StudentExercisePage messages={t} locale={locale} /></RequireRole>} />
      <Route path="teacher" element={<RequireRole role="teacher" messages={t}><DashboardLayout /></RequireRole>}>
        <Route index element={<TeacherDashboardPage />} />
        <Route path="modules" element={<TeacherModulesPage messages={t} />} />
        <Route path="modules/:moduleId" element={<TeacherModulePage messages={t} />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="students" element={<AccountsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="materials/:lessonId" element={<MaterialEditorPage />} />
        <Route path="classes/:classId" element={<GroupPage />} />
      </Route>
      <Route path="admin" element={<RequireRole role="admin" messages={t}><DashboardLayout /></RequireRole>}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="students" element={<AccountsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="materials/:lessonId" element={<MaterialEditorPage />} />
        <Route path="modules" element={<TeacherModulesPage messages={t} />} />
        <Route path="modules/:moduleId" element={<TeacherModulePage messages={t} />} />
        <Route path="classes/:classId" element={<GroupPage />} />
      </Route>
      <Route path="admin/classes/:classId/live" element={<RequireRole role="admin" messages={t}><TeacherLivePage messages={t} locale={locale} /></RequireRole>} />
      <Route path="teacher/classes/:classId/live" element={<RequireRole role="teacher" messages={t}><TeacherLivePage messages={t} locale={locale} /></RequireRole>} />
      <Route path="*" element={<NotFound messages={t} />} />
    </Routes>
  </AuthProvider>;
}

export function SessionHome({ messages }: { messages: Messages }) {
  const { state } = useAuth();
  if (state.status === 'signed-out' || state.status === 'signed-in') return <LoginChoicePage />;
  return <AuthStatus messages={messages} />;
}

function NotFound({ messages: t }: { messages: Messages }) {
  return <main className="account-page account-narrow">
    <h1>{t.notFoundTitle}</h1>
    <p className="account-links"><Link to="/join">{t.studentLoginLink}</Link><Link to="/">{t.homeLink}</Link></p>
  </main>;
}
