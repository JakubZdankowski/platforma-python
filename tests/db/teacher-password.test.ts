import { expect, test } from 'vitest';
import { signInStudent, signInTeacher } from '../../src/auth/authService';
import { anonClient } from './localSupabase';
import { sessionFixture } from './sessionFixture';

test('teachers reset only assigned students, revoke sessions, and cannot create accounts', async () => {
  const f = await sessionFixture();
  const other = await sessionFixture();
  const teacher = anonClient(), student = anonClient(), fresh = anonClient(), secondTeacher = anonClient();
  const reset = (studentId: string) => teacher.functions.invoke<{ password: string }>('teacher-students', {
    body: { action: 'reset-password', studentId },
  });
  try {
    expect(await signInTeacher(teacher, f.teacherEmail, f.password)).toBeNull();
    expect((await reset(other.studentId)).error).not.toBeNull();
    expect((await reset(f.teacherId)).error).not.toBeNull();
    const create = await teacher.functions.invoke('teacher-students', {
      body: { action: 'create', username: 'forbidden-new', displayName: 'Forbidden' },
    });
    expect(create.error).not.toBeNull();

    // Assignment, rather than who created the account, grants access.
    expect((await f.admin.from('class_members').insert({ class_id: f.classId, student_id: other.studentId })).error).toBeNull();
    expect(await signInStudent(student, other.joinCode, other.username, other.password)).toBeNull();
    expect((await student.functions.invoke('teacher-students', {
      body: { action: 'reset-password', studentId: other.studentId },
    })).error).not.toBeNull();
    const result = await reset(other.studentId);
    expect(result.error).toBeNull();
    expect(result.data?.password).toMatch(/^[a-hjkmnp-z2-9]{8}$/);
    expect((await student.rpc('is_current_session')).data).toBe(false);
    expect(await signInStudent(fresh, other.joinCode, other.username, other.password)).toBe('invalid-credentials');
    expect(await signInStudent(fresh, other.joinCode, other.username, result.data!.password)).toBeNull();

    expect((await f.admin.from('class_members').delete().eq('class_id', f.classId).eq('student_id', other.studentId)).error).toBeNull();
    expect((await reset(other.studentId)).error).not.toBeNull();
    expect(await signInTeacher(secondTeacher, f.teacherEmail, f.password)).toBeNull();
    expect((await reset(f.studentId)).error).not.toBeNull();
  } finally {
    for (const client of [teacher, student, fresh, secondTeacher]) await client.auth.signOut({ scope: 'local' });
    await other.cleanup();
    await f.cleanup();
  }
});
