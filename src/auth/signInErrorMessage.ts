import type { Messages } from '../i18n/en';
import type { SignInError, UserRole } from './authService';

export function signInErrorMessage(t: Messages, error: SignInError, role: UserRole): string {
  if (error === 'rate-limited') return t.signInRateLimited;
  if (error === 'unavailable') return t.signInUnavailable;
  return role === 'student' ? t.studentSignInFailed : t.teacherSignInFailed;
}
