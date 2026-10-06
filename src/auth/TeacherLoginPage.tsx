import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import type { Messages } from '../i18n/en';
import { useAuth } from './AuthProvider';
import { signInTeacher, type SignInError } from './authService';
import { AuthStatus, homePath } from './RequireRole';
import { signInErrorMessage } from './signInErrorMessage';

export function TeacherLoginPage({ messages: t }: { messages: Messages }) {
  const { client, state } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);

  if (state.status === 'signed-in') return <Navigate to={homePath(state.profile.role)} replace />;
  // While a submitted sign-in loads the profile, keep the (disabled) form on screen.
  if (state.status !== 'signed-out' && !(state.status === 'loading' && submitting)) return <AuthStatus messages={t} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signInTeacher(client, email, password);
    if (result) {
      setError(result);
      setPassword('');
      setSubmitting(false);
    }
  };

  return <main className="account-page account-narrow">
    <h1>{t.teacherLoginTitle}</h1>
    <form className="form" onSubmit={(event) => void submit(event)} noValidate>
      <label className="field">
        <span>{t.email}</span>
        <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
      </label>
      <label className="field">
        <span>{t.password}</span>
        <input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
      </label>
      {error && <p className="form-error" role="alert">{signInErrorMessage(t, error, 'teacher')}</p>}
      <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? t.signingIn : t.signIn}</button>
    </form>
    <p className="account-links"><Link to="/join">{t.studentLoginLink}</Link></p>
  </main>;
}
