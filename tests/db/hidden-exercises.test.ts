import { expect, it } from 'vitest';
import { sessionFixture } from './sessionFixture';
import { anonClient } from './localSupabase';
import { signInTeacher, signInStudentAccount } from '../../src/auth/authService';
import { listLessons } from '../../src/lessons/lessonService';

it('hidden exercises stay available to staff, exclude student reads and writes, and preserve work when restored', async () => {
  const f = await sessionFixture('admin');
  const staff = anonClient(), student = anonClient();
  try {
    expect(await signInTeacher(staff, f.teacherEmail, f.password)).toBeNull();
    expect(await signInStudentAccount(student, f.username, f.password)).toBeNull();
    const exercise = await f.admin.from('exercises').select('*').eq('id', f.exerciseId).single();
    if (exercise.error) throw exercise.error;
    const e = exercise.data;
    expect(e.is_hidden).toBe(false);
    expect((await student.from('student_work').insert({ student_id: f.studentId, exercise_id: e.id, code: '# zachowana praca', status: 'completed' })).error).toBeNull();
    const original = { id: e.id, title: e.title, markdown: e.instructions_markdown, code: e.starter_code, runtime: e.runtime_type };
    const visible = { title: 'Widoczne ćwiczenie', markdown: 'Widoczna instrukcja', code: '', runtime: 'python-console' };
    const hidden = await staff.rpc('save_material', { p_lesson_id: e.lesson_id, p_title: 'Lekcja sesji', p_status: 'approved', p_exercises: [{ ...original, hidden: true }, visible] });
    expect(hidden.error).toBeNull();
    expect((await student.from('exercises').select('*').eq('id', e.id)).data).toEqual([]);
    const lessons = await listLessons(student, undefined, [e.lesson_id]);
    expect(lessons[0]?.exercises.map(x => x.title)).toEqual(['Widoczne ćwiczenie']);
    const all = await staff.from('exercises').select('*').eq('lesson_id', e.lesson_id).order('position');
    expect(all.error).toBeNull();
    expect(all.data).toHaveLength(2);
    expect(all.data?.[0]).toMatchObject({ id: e.id, is_hidden: true });
    const next = all.data![1]!;
    expect(next.is_hidden).toBe(false);
    expect((await staff.rpc('class_student_exercises', { p_class_id: f.classId })).data?.map(x => x.id)).toEqual([next.id]);
    const rejected = await student.from('student_work').insert({ student_id: f.studentId, exercise_id: e.id, code: 'forbidden' });
    expect(rejected.error?.code).toBe('42501');
    const update = await student.from('student_work').update({ code: 'forbidden' }).eq('exercise_id', e.id).select('code');
    expect(update.data ?? []).toEqual([]);
    expect((await f.admin.from('student_work').select('code,status').eq('exercise_id', e.id).single()).data).toEqual({ code: '# zachowana praca', status: 'completed' });
    const nextPayload = { id: next.id, title: next.title, markdown: next.instructions_markdown, code: next.starter_code, runtime: next.runtime_type };
    // Older editors omit visibility: they must not accidentally reveal a hidden exercise.
    expect((await staff.rpc('save_material', { p_lesson_id: e.lesson_id, p_title: 'Lekcja sesji', p_status: 'approved', p_exercises: [original, nextPayload] })).error).toBeNull();
    expect((await staff.from('exercises').select('is_hidden').eq('id', e.id).single()).data?.is_hidden).toBe(true);
    expect((await staff.rpc('save_material', { p_lesson_id: e.lesson_id, p_title: 'Lekcja sesji', p_status: 'approved', p_exercises: [{ ...original, hidden: false }, nextPayload] })).error).toBeNull();
    expect((await student.from('exercises').select('id').eq('id', e.id).single()).data?.id).toBe(e.id);
    expect((await student.from('student_work').select('code,status').eq('exercise_id', e.id).single()).data).toEqual({ code: '# zachowana praca', status: 'completed' });
    expect((await student.from('student_work').update({ code: '# po przywróceniu' }).eq('exercise_id', e.id).select('code')).data).toEqual([{ code: '# po przywróceniu' }]);
  } finally { await f.cleanup(); }
});
