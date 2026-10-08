import type { AuthError } from '@supabase/supabase-js';
import type { AppSupabaseClient } from '../database/supabase';
import type { Database } from '../database/database.types';
import { normalizeJoinCode, normalizeUsername } from './credentials';

export type UserRole = Database['public']['Enums']['user_role'];

export interface Profile {
  id: string;
  role: UserRole;
  displayName: string;
  username: string | null;
}

export type SignInError = 'invalid-credentials' | 'rate-limited' | 'unavailable';

function signInErrorFrom(error: AuthError): SignInError {
  if (error.status === 429) return 'rate-limited';
  if (error.status === 400 || error.code === 'invalid_credentials') return 'invalid-credentials';
  return 'unavailable';
}

/**
 * Student login: class code + username + password. The database maps the
 * first two to the hidden internal auth address; Supabase Auth checks the
 * password. Unknown codes and usernames fail like a wrong password.
 */
export async function signInStudent(
  client: AppSupabaseClient,
  joinCode: string,
  username: string,
  password: string,
): Promise<SignInError | null> {
  const code = normalizeJoinCode(joinCode);
  const name = normalizeUsername(username);
  if (!code || !name || !password) return 'invalid-credentials';

  const { data: email, error } = await client.rpc('student_login_email', { p_join_code: code, p_username: name });
  if (error || !email) {
    console.error('Student login lookup failed', error?.message);
    return 'unavailable';
  }
  return signInWithEmail(client, email, password);
}

export async function signInTeacher(client: AppSupabaseClient, email: string, password: string): Promise<SignInError | null> {
  const address = email.trim();
  if (!address || !password) return 'invalid-credentials';
  return signInWithEmail(client, address, password);
}

async function signInWithEmail(client: AppSupabaseClient, email: string, password: string): Promise<SignInError | null> {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (!error) {
    const claimed = await client.rpc('claim_account_session');
    if (!claimed.error && claimed.data === true) return null;
    await signOut(client);
    return 'unavailable';
  }
  const result = signInErrorFrom(error);
  if (result === 'unavailable') console.error('Sign-in failed', error.status, error.code);
  return result;
}

export async function signOut(client: AppSupabaseClient): Promise<void> {
  // 'local' ends this browser's session even when the server is unreachable.
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) console.error('Sign-out failed', error.message);
}

/** Returns null when the user has no profile, i.e. no classroom role. Throws when the request fails. */
export async function loadProfile(client: AppSupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, role, display_name, username')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`Profile request failed: ${error.message}`);
  if (!data) return null;
  return { id: data.id, role: data.role, displayName: data.display_name, username: data.username };
}
