import { expect, test } from 'vitest';
import { sessionFixture } from './sessionFixture';
import { anonClient } from './localSupabase';
import { signInTeacher } from '../../src/auth/authService';

test('module access combines group and individual grants, isolates owners, and preserves saved work', async () => {
  const f = await sessionFixture();
  const other = await sessionFixture();
  const teacher = anonClient();
  const student = anonClient();
  try {
    expect(await signInTeacher(teacher, f.teacherEmail, f.password)).toBeNull();
    const lookup = await student.rpc('student_login_address', { p_username: f.username });
    expect((await student.auth.signInWithPassword({ email: lookup.data!, password: f.password })).error).toBeNull();
    expect((await student.rpc('claim_account_session')).data).toBe(true);
    const migrated = await teacher.from('modules').select('id').eq('legacy_class_id', f.classId).single();
    if (migrated.error) throw migrated.error;
    const moduleId = migrated.data.id;
    expect((await student.from('modules').select('id')).data).toEqual([{ id: moduleId }]);
    expect((await student.from('group_module_assignments').select('*')).data).toEqual([]);
    expect((await teacher.from('student_module_assignments').insert({ module_id: moduleId, student_id: f.studentId })).error).toBeNull();
    expect((await student.from('modules').select('id')).data).toHaveLength(1);
    expect((await teacher.from('student_module_assignments').insert({ module_id: moduleId, student_id: other.studentId })).error).not.toBeNull();
    const otherModule = await f.admin.from('modules').select('id').eq('teacher_id', other.teacherId).single();
    expect((await teacher.from('module_lessons').insert({ module_id: otherModule.data!.id, lesson_id: '00000000-0000-4000-8000-000000000000' })).error).not.toBeNull();
    expect((await anonClient().from('modules').select('*')).data ?? []).toEqual([]);
    expect((await student.from('modules').insert({ title: 'Forbidden' })).error).not.toBeNull();
    expect((await student.from('student_work').insert({ student_id: f.studentId, exercise_id: f.exerciseId, code: 'print(42)' })).error).toBeNull();
    expect((await teacher.from('group_module_assignments').delete().eq('module_id', moduleId).eq('class_id', f.classId)).error).toBeNull();
    expect((await student.from('exercises').select('id').eq('id', f.exerciseId)).data).toHaveLength(1);
    expect((await teacher.from('student_module_assignments').delete().eq('module_id', moduleId).eq('student_id', f.studentId)).error).toBeNull();
    expect((await student.from('modules').select('id')).data).toEqual([]);
    expect((await student.from('exercises').select('id').eq('id', f.exerciseId)).data).toEqual([]);
    expect((await student.from('student_work').update({ code: 'overwritten' }).eq('exercise_id', f.exerciseId).select()).data).toEqual([]);
    expect((await f.admin.from('student_work').select('code').eq('student_id', f.studentId)).data).toEqual([{ code: 'print(42)' }]);
    // Direct grant restores access without any group membership or duplicate code.
    await f.admin.from('class_members').delete().eq('student_id', f.studentId);
    expect((await teacher.from('student_module_assignments').insert({ module_id: moduleId, student_id: f.studentId })).error).toBeNull();
    expect((await student.from('exercises').select('id').eq('id', f.exerciseId)).data).toHaveLength(1);
    const replacement = anonClient();
    await replacement.auth.signInWithPassword({ email: lookup.data!, password: f.password });
    await replacement.rpc('claim_account_session');
    expect((await student.from('modules').select('id')).data).toEqual([]);
    expect((await replacement.from('modules').select('id')).data).toHaveLength(1);
    await replacement.auth.signOut();
  } finally { await teacher.auth.signOut(); await student.auth.signOut(); await f.cleanup(); await other.cleanup(); }
});

