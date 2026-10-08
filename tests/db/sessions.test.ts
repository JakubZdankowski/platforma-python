import { expect, it } from 'vitest';
import { signInStudent, signInTeacher } from '../../src/auth/authService';
import { anonClient } from './localSupabase';
import { sessionFixture } from './sessionFixture';

it('new login revokes old tokens immediately and old sessions cannot reclaim the account', async () => {
  const f = await sessionFixture();
  const first = anonClient();
  const second = anonClient();
  try {
    expect(await signInStudent(first, f.joinCode, f.username, f.password)).toBeNull();
    const oldSession = (await first.auth.getSession()).data.session!;
    const initial = await first.from('student_work').insert({ student_id: f.studentId, exercise_id: f.exerciseId, code: 'first' });
    expect(initial.error).toBeNull();
    expect(await signInStudent(second, f.joinCode, f.username, 'wrong-password')).toBe('invalid-credentials');
    expect((await first.rpc('is_current_session')).data).toBe(true);
    expect(await signInStudent(second, f.joinCode, f.username, f.password)).toBeNull();
    expect((await first.rpc('is_current_session')).data).toBe(false);
    expect((await second.rpc('is_current_session')).data).toBe(true);
    const stale = await first.from('student_work').update({ code: 'stale overwrite' }).eq('exercise_id', f.exerciseId).select();
    expect(stale.data ?? []).toHaveLength(0);
    expect((await first.from('profiles').select('id')).data).toHaveLength(0);
    expect((await first.rpc('claim_account_session')).data).toBe(false);
    const fresh = await second.from('student_work').update({ code: 'second' }).eq('exercise_id', f.exerciseId).select();
    expect(fresh.error).toBeNull();
    expect(fresh.data).toHaveLength(1);
    expect((await f.admin.from('student_work').select('code').eq('student_id', f.studentId).single()).data?.code).toBe('second');
    await second.auth.signOut({ scope: 'local' });
    // Closing the winning session does not reactivate an old one.
    expect((await first.rpc('claim_account_session')).data ?? false).toBe(false);
    expect((await first.from('student_work').select('code')).data ?? []).toHaveLength(0);
    const refresh = await first.auth.refreshSession({ refresh_token: oldSession.refresh_token });
    expect(refresh.error).not.toBeNull();

    expect(await signInTeacher(first, f.teacherEmail, f.password)).toBeNull();
    expect(await signInTeacher(second, f.teacherEmail, f.password)).toBeNull();
    expect((await first.from('classes').select('id')).data).toHaveLength(0);
    expect((await second.from('classes').select('id')).data).toHaveLength(1);
    const oldAdminAction = await first.functions.invoke('teacher-students', { body: {
      action: 'create', classId: f.classId, username: 'stale-test', displayName: 'Stara sesja',
    } });
    expect(oldAdminAction.error).not.toBeNull();
    const newAdminAction = await second.functions.invoke('teacher-students', { body: {
      action: 'create', classId: f.classId, username: 'fresh-test', displayName: 'Nowa sesja',
    } });
    expect(newAdminAction.error).toBeNull();
  } finally {
    await first.auth.signOut({ scope: 'local' });
    await second.auth.signOut({ scope: 'local' });
    await f.cleanup();
  }
});
