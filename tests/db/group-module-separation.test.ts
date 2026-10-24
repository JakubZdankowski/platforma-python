import { expect, test } from 'vitest';
import { sessionFixture } from './sessionFixture';
import { anonClient } from './localSupabase';
import { signInTeacher } from '../../src/auth/authService';

test('one reusable module serves separate scheduled groups without coupling their identity or content', async () => {
  const f = await sessionFixture();
  let secondId: string | undefined;
  try {
    const second = await f.admin.from('classes').insert({ teacher_id: f.teacherId, name: 'Wtorkowa grupa', meeting_day: 2, meeting_time: '17:30' }).select('id').single();
    if (second.error) throw second.error;
    secondId = second.data.id;
    expect((await f.admin.from('modules').select('id').eq('legacy_class_id', secondId)).data).toEqual([]);
    expect((await f.admin.from('group_module_assignments').insert({ class_id: secondId, module_id: f.moduleId })).error).toBeNull();
    expect((await f.admin.from('classes').update({ name: 'Nowa nazwa grupy', meeting_day: 4, meeting_time: '18:00' }).eq('id', secondId)).error).toBeNull();
    expect((await f.admin.from('modules').select('title').eq('id', f.moduleId).single()).data?.title).toBe('Moduł testowy');
    expect((await f.admin.from('modules').update({ title: 'Podstawy Pythona' }).eq('id', f.moduleId)).error).toBeNull();
    expect((await f.admin.from('classes').select('name').eq('id', secondId).single()).data?.name).toBe('Nowa nazwa grupy');
    expect((await f.admin.from('classes').update({ meeting_day: 8 }).eq('id', secondId)).error).not.toBeNull();
    expect((await f.admin.from('classes').update({ meeting_time: null }).eq('id', secondId)).error).not.toBeNull();
    // Even historical lesson-assignment writes no longer fabricate or populate a module.
    expect((await f.admin.from('assignments').insert({ class_id: secondId, lesson_id: (await f.admin.from('exercises').select('lesson_id').eq('id', f.exerciseId).single()).data!.lesson_id })).error).toBeNull();
    expect((await f.admin.from('modules').select('id').eq('legacy_class_id', secondId)).data).toEqual([]);
    expect((await f.admin.from('classes').delete().eq('id', secondId)).error).toBeNull();
    expect((await f.admin.from('module_lessons').select('lesson_id').eq('module_id', f.moduleId)).data).toHaveLength(1);
    expect((await f.admin.from('group_module_assignments').select('class_id').eq('module_id', f.moduleId)).data).toEqual([{ class_id: f.classId }]);
    const teacher = anonClient();
    expect(await signInTeacher(teacher, f.teacherEmail, f.password)).toBeNull();
    expect((await teacher.from('classes').update({ meeting_day: 1, meeting_time: '09:00' }).eq('id', f.classId).select()).data).toEqual([]);
    await teacher.auth.signOut();
  } finally {
    if (secondId) await f.admin.from('classes').delete().eq('id', secondId);
    await f.cleanup();
  }
});

test('removing one group grant keeps access through another group and preserves saved code after the last grant is removed', async () => {
  const f = await sessionFixture();
  let secondId: string | undefined;
  const student = anonClient();
  try {
    const second = await f.admin.from('classes').insert({ teacher_id: f.teacherId, name: 'Druga grupa' }).select('id').single();
    if (second.error) throw second.error;
    secondId = second.data.id;
    expect((await f.admin.from('class_members').insert({ class_id: secondId, student_id: f.studentId })).error).toBeNull();
    expect((await f.admin.from('group_module_assignments').insert({ class_id: secondId, module_id: f.moduleId })).error).toBeNull();
    expect((await student.auth.signInWithPassword({email:f.studentEmail,password:f.password})).error).toBeNull();
    expect((await student.rpc('claim_account_session')).data).toBe(true);
    expect((await student.from('student_work').insert({student_id:f.studentId,exercise_id:f.exerciseId,code:'print(123)'})).error).toBeNull();
    await f.admin.from('group_module_assignments').delete().eq('class_id',f.classId).eq('module_id',f.moduleId);
    expect((await student.from('exercises').select('id').eq('id',f.exerciseId)).data).toHaveLength(1);
    await f.admin.from('group_module_assignments').delete().eq('class_id',secondId).eq('module_id',f.moduleId);
    expect((await student.from('exercises').select('id').eq('id',f.exerciseId)).data).toEqual([]);
    expect((await f.admin.from('student_work').select('code').eq('student_id',f.studentId)).data).toEqual([{code:'print(123)'}]);
  } finally {
    await student.auth.signOut();
    if(secondId) await f.admin.from('classes').delete().eq('id',secondId);
    await f.cleanup();
  }
});
