import { AuthApiError } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppSupabaseClient } from '../database/supabase';
import { signInStudent, signInTeacher } from './authService';

function fakeClient(options: { rpcError?: boolean; signInError?: AuthApiError; claimRejected?: boolean } = {}) {
  const rpc = vi.fn(async (name: string) => (options.rpcError
    ? { data: null, error: { message: 'boom' } }
    : { data: name === 'student_login_email' ? 'internal@students.invalid' : !options.claimRejected, error: null }));
  const signInWithPassword = vi.fn(async () => ({ data: {}, error: options.signInError ?? null }));
  const signOut = vi.fn(async () => ({ error: null }));
  const client = { rpc, auth: { signInWithPassword, signOut } } as unknown as AppSupabaseClient;
  return { client, rpc, signInWithPassword, signOut };
}

afterEach(() => vi.restoreAllMocks());

describe('signInStudent', () => {
  it('resolves the internal address from the class code and username, then checks the password', async () => {
    const { client, rpc, signInWithPassword } = fakeClient();
    expect(await signInStudent(client, ' python25 ', ' Kuba ', 'secret-pass')).toBeNull();
    expect(rpc).toHaveBeenCalledWith('student_login_email', { p_join_code: 'PYTHON25', p_username: 'kuba' });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'internal@students.invalid', password: 'secret-pass' });
    expect(rpc).toHaveBeenCalledWith('claim_account_session');
  });

  it('does not call the server for empty fields', async () => {
    const { client, rpc } = fakeClient();
    expect(await signInStudent(client, 'PYTHON25', '', 'x')).toBe('invalid-credentials');
    expect(await signInStudent(client, 'PYTHON25', 'kuba', '')).toBe('invalid-credentials');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('maps Supabase errors to simple categories', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const wrong = fakeClient({ signInError: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials') });
    expect(await signInStudent(wrong.client, 'PYTHON25', 'kuba', 'bad')).toBe('invalid-credentials');
    const limited = fakeClient({ signInError: new AuthApiError('Too many requests', 429, 'over_request_rate_limit') });
    expect(await signInStudent(limited.client, 'PYTHON25', 'kuba', 'bad')).toBe('rate-limited');
    const offline = fakeClient({ rpcError: true });
    expect(await signInStudent(offline.client, 'PYTHON25', 'kuba', 'pass')).toBe('unavailable');
  });

  it('never logs the password', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken = fakeClient({ signInError: new AuthApiError('Server error', 500, 'unexpected_failure') });
    expect(await signInStudent(broken.client, 'PYTHON25', 'kuba', 'very-secret')).toBe('unavailable');
    expect(JSON.stringify(error.mock.calls)).not.toContain('very-secret');
  });
});

describe('signInTeacher', () => {
  it('ends a login that cannot claim the current session', async () => {
    const { client, signOut } = fakeClient({ claimRejected: true });
    expect(await signInTeacher(client, 'teacher@example.test', 'pw')).toBe('unavailable');
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('signs in with a trimmed email address', async () => {
    const { client, signInWithPassword } = fakeClient();
    expect(await signInTeacher(client, ' teacher@example.test ', 'pw')).toBeNull();
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'teacher@example.test', password: 'pw' });
  });
});
