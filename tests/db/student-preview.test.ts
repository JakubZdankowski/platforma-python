import { expect, it } from 'vitest';
import { sessionFixture } from './sessionFixture';
import { anonClient } from './localSupabase';
import { signInTeacher, signInStudentAccount } from '../../src/auth/authService';

it('staff preview resolves individual and other-group access, excludes drafts, and enforces session and group access', async () => {
  const f = await sessionFixture(), other = await sessionFixture();
  const teacher = anonClient(), stranger = anonClient(), student = anonClient();
  let moduleId: string | undefined;
  try {
    expect(await signInTeacher(teacher, f.teacherEmail, f.password)).toBeNull();
    expect(await signInTeacher(stranger, other.teacherEmail, other.password)).toBeNull();
    expect(await signInStudentAccount(student, f.username, f.password)).toBeNull();
    const initial = await teacher.rpc('class_student_exercises', { p_class_id: f.classId });
    expect(initial.error).toBeNull();
    expect(initial.data?.map(e => e.id)).toEqual([f.exerciseId]);
    expect((await stranger.rpc('class_student_exercises', { p_class_id: f.classId })).data).toEqual([]);
    expect((await student.rpc('class_student_exercises', { p_class_id: f.classId })).data).toEqual([]);
    const lessonId = (await f.admin.from('exercises').select('lesson_id').eq('id', other.exerciseId).single()).data!.lesson_id;
    const m = await f.admin.from('modules').insert({ teacher_id: other.teacherId, title: 'Indywidualny moduł' }).select('id').single();
    expect(m.error).toBeNull(); moduleId = m.data!.id;
    expect((await f.admin.from('module_lessons').insert({ module_id: moduleId, lesson_id: lessonId })).error).toBeNull();
    expect((await f.admin.from('student_module_assignments').insert({ student_id: f.studentId, module_id: moduleId })).error).toBeNull();
    const individual = await teacher.rpc('class_student_exercises', { p_class_id: f.classId });
    expect(individual.data?.map(e => e.id)).toContain(other.exerciseId);
    // A second path must not duplicate an exercise.
    expect((await f.admin.from('class_members').insert({ student_id: f.studentId, class_id: other.classId })).error).toBeNull();
    expect((await teacher.rpc('class_student_exercises', { p_class_id: f.classId })).data?.filter(e => e.id === other.exerciseId)).toHaveLength(1);
    await f.admin.from('student_module_assignments').delete().eq('student_id', f.studentId).eq('module_id', moduleId);
    expect((await teacher.rpc('class_student_exercises', { p_class_id: f.classId })).data?.map(e => e.id)).toContain(other.exerciseId);
    await f.admin.from('lessons').update({ publication_status: 'draft' }).eq('id', lessonId);
    expect((await teacher.rpc('class_student_exercises', { p_class_id: f.classId })).data?.map(e => e.id)).not.toContain(other.exerciseId);
    const replacement = anonClient();
    expect(await signInTeacher(replacement, f.teacherEmail, f.password)).toBeNull();
    expect((await teacher.rpc('class_student_exercises', { p_class_id: f.classId })).data).toEqual([]);
    expect((await replacement.rpc('class_student_exercises', { p_class_id: f.classId })).data).toHaveLength(1);
    await f.admin.from('class_teachers').delete().eq('class_id', f.classId).eq('teacher_id', f.teacherId);
    expect((await replacement.rpc('class_student_exercises', { p_class_id: f.classId })).data).toEqual([]);
  } finally {
    if (moduleId) await f.admin.from('modules').delete().eq('id', moduleId);
    await f.cleanup(); await other.cleanup();
  }
});
