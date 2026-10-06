import { Link, Route, Routes } from 'react-router';
import { AccountBar } from '../auth/AccountBar';
import { AuthProvider } from '../auth/AuthProvider';
import { RequireRole } from '../auth/RequireRole';
import { StudentLoginPage } from '../auth/StudentLoginPage';
import { TeacherLoginPage } from '../auth/TeacherLoginPage';
import { getSupabase } from '../database/supabase';
import type { Messages } from '../i18n/en';
import { StudentHomePage } from '../student/StudentHomePage';
import { ClassPage } from '../teacher/ClassPage';
import { TeacherClassesPage } from '../teacher/TeacherClassesPage';

/** Signed-in part of the app. Loaded lazily so the local playground does not download the Supabase client. */
export default function AccountApp({ messages: t }: { messages: Messages }) {
  const client = getSupabase();
  if (!client) {
    return <main className="account-page account-narrow">
      <p className="form-error" role="alert">{t.backendNotConfigured}</p>
      <p><Link to="/">{t.practiceLink}</Link></p>
    </main>;
  }

  return <AuthProvider client={client}>
    <AccountBar messages={t} />
    <Routes>
      <Route path="join" element={<StudentLoginPage messages={t} />} />
      <Route path="login" element={<TeacherLoginPage messages={t} />} />
      <Route path="student" element={<RequireRole role="student" messages={t}><StudentHomePage messages={t} /></RequireRole>} />
      <Route path="teacher" element={<RequireRole role="teacher" messages={t}><TeacherClassesPage messages={t} /></RequireRole>} />
      <Route path="teacher/classes/:classId" element={<RequireRole role="teacher" messages={t}><ClassPage messages={t} /></RequireRole>} />
      <Route path="*" element={<NotFound messages={t} />} />
    </Routes>
  </AuthProvider>;
}

function NotFound({ messages: t }: { messages: Messages }) {
  return <main className="account-page account-narrow">
    <h1>{t.notFoundTitle}</h1>
    <p className="account-links"><Link to="/join">{t.studentLoginLink}</Link><Link to="/">{t.practiceLink}</Link></p>
  </main>;
}
