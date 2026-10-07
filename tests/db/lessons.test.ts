import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { signInStudent, signInTeacher } from '../../src/auth/authService';
import type { AppSupabaseClient } from '../../src/database/supabase';
import { adminClient, anonClient, SEED } from './localSupabase';

const admin = adminClient();
const run = Date.now().toString(36);
const teacher = anonClient();
const student = anonClient();
const classmate = anonClient();
const otherTeacher = anonClient();
let teacherId: string;
let studentId: string;
let classmateId: string;
let otherTeacherId: string;
let lessonId: string;
let unassignedId: string;
let otherLessonId: string;
let exerciseId: string;
let unassignedExerciseId: string;
let classId: string;

async function userId(client: AppSupabaseClient) { return (await client.auth.getUser()).data.user!.id; }
async function lesson(owner: string, slug: string) {
  const result = await admin.from('lessons').insert({ teacher_id: owner, slug: `${slug}-${run}`, title: slug }).select('id').single();
  if (result.error) throw result.error;
  return result.data.id;
}
async function exercise(lesson: string) {
  const result = await admin.from('exercises').insert({ lesson_id: lesson, slug: 'exercise-01', title: 'Powitanie', instructions_markdown: 'Zadanie', starter_code: 'print("start")', runtime_type: 'python-console' }).select('id').single();
  if (result.error) throw result.error;
  return result.data.id;
}

beforeAll(async () => {
  expect(await signInTeacher(teacher, SEED.teacher.email, SEED.teacher.password)).toBeNull();
  expect(await signInStudent(student, SEED.joinCode, 'ania', SEED.password('ania'))).toBeNull();
  expect(await signInStudent(classmate, SEED.joinCode, 'ola', SEED.password('ola'))).toBeNull();
  teacherId = await userId(teacher); studentId = await userId(student); classmateId = await userId(classmate);
  classId = (await teacher.from('classes').select('id').eq('join_code', SEED.joinCode).single()).data!.id;
  const email = `lesson-owner-${run}@example.test`;
  const password = `lesson-owner-${run}-password`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: 'teacher', display_name: 'Other' } });
  if (created.error) throw created.error;
  otherTeacherId = created.data.user.id;
  expect(await signInTeacher(otherTeacher, email, password)).toBeNull();
  lessonId = await lesson(teacherId, 'assigned');
  unassignedId = await lesson(teacherId, 'unassigned');
  otherLessonId = await lesson(otherTeacherId, 'other');
  exerciseId = await exercise(lessonId); unassignedExerciseId = await exercise(unassignedId);
  expect((await teacher.from('assignments').insert({ class_id: classId, lesson_id: lessonId })).error).toBeNull();
  expect((await student.from('student_work').insert({ student_id: studentId, exercise_id: exerciseId, code: 'ania' })).error).toBeNull();
  expect((await classmate.from('student_work').insert({ student_id: classmateId, exercise_id: exerciseId, code: 'ola' })).error).toBeNull();
});
afterAll(async () => {
  await admin.from('lessons').delete().in('id', [lessonId, unassignedId, otherLessonId].filter(Boolean));
  if (otherTeacherId) await admin.auth.admin.deleteUser(otherTeacherId);
});

describe('MVP lesson and work permissions', () => {
  it('signed-out visitors cannot read content or work', async () => {
    for (const table of ['lessons', 'exercises', 'assignments', 'student_work'] as const) {
      const result = await anonClient().from(table).select('*');
      expect(result.data ?? []).toEqual([]);
      expect(result.error).not.toBeNull();
    }
  });
  it('students only read assigned lessons and exercises, even when requesting ids directly', async () => {
    expect((await student.from('lessons').select('id').in('id', [lessonId, unassignedId, otherLessonId])).data).toEqual([{ id: lessonId }]);
    expect((await student.from('exercises').select('id').eq('id', unassignedExerciseId)).data).toEqual([]);
    expect((await student.from('student_work').insert({ student_id: studentId, exercise_id: unassignedExerciseId, code: 'hack' })).error).not.toBeNull();
  });
  it('students cannot read or alter another student’s work or move work identity', async () => {
    expect((await student.from('student_work').select('student_id, code').eq('exercise_id', exerciseId)).data).toEqual([{ student_id: studentId, code: 'ania' }]);
    expect((await student.from('student_work').update({ code: 'hack' }).eq('student_id', classmateId).eq('exercise_id', exerciseId).select()).data).toEqual([]);
    expect((await student.from('student_work').insert({ student_id: classmateId, exercise_id: unassignedExerciseId, code: 'hack' })).error).not.toBeNull();
    expect((await student.from('student_work').update({ student_id: classmateId }).eq('exercise_id', exerciseId)).error).not.toBeNull();
    expect((await student.from('student_work').update({ last_edited_at: '2099-01-01' }).eq('exercise_id', exerciseId)).error).not.toBeNull();
  });
  it('teachers read only their content and managed students’ work and cannot edit student work', async () => {
    expect((await otherTeacher.from('lessons').select('id').in('id', [lessonId, otherLessonId])).data).toEqual([{ id: otherLessonId }]);
    expect((await otherTeacher.from('student_work').select('code').eq('exercise_id', exerciseId)).data).toEqual([]);
    const result = await teacher.from('student_work').select('code').eq('exercise_id', exerciseId).order('code');
    expect(result.data).toEqual([{ code: 'ania' }, { code: 'ola' }]);
    expect((await teacher.from('student_work').update({ code: 'teacher edit' }).eq('exercise_id', exerciseId).select()).data).toEqual([]);
  });
  it('only class owners assign lessons, and foreign content cannot be assigned even by service role', async () => {
    expect((await student.from('assignments').insert({ class_id: classId, lesson_id: unassignedId })).error).not.toBeNull();
    expect((await otherTeacher.from('assignments').insert({ class_id: classId, lesson_id: otherLessonId })).error).not.toBeNull();
    expect((await teacher.from('assignments').insert({ class_id: classId, lesson_id: otherLessonId })).error).not.toBeNull();
    expect((await admin.from('assignments').insert({ class_id: classId, lesson_id: otherLessonId })).error).not.toBeNull();
    expect((await student.from('lessons').insert({ teacher_id: studentId, slug: 'hack', title: 'hack' })).error).not.toBeNull();
    expect((await teacher.from('exercises').update({ starter_code: 'hack' }).eq('id', exerciseId)).error).not.toBeNull();
  });
  it('Realtime delivers saved work to its teacher but not to classmates or another teacher', async () => {
    const teacherEvents: string[] = [];
    const forbiddenEvents: string[] = [];
    const sessions = [teacher, classmate, otherTeacher];
    const channels = sessions.map((client, index) => client.channel(`privacy-${run}-${index}`, {
      config: { postgres_changes_options: { wait: true } },
    })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'student_work', filter: `exercise_id=eq.${exerciseId}` }, (event) => {
        if (index === 0) teacherEvents.push(String(event.new.code)); else forbiddenEvents.push(String(event.new.code));
      }));
    try {
      await Promise.all(channels.map((channel) => new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Realtime subscription timed out')), 20_000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new Error(status)); }
        });
      })));
      expect((await student.from('student_work').update({ code: 'realtime-private-code', status: 'in_progress' }).eq('exercise_id', exerciseId)).error).toBeNull();
      await vi.waitFor(() => expect(teacherEvents).toContain('realtime-private-code'), { timeout: 5000 });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(forbiddenEvents).toEqual([]);
    } finally {
      await Promise.all(channels.map((channel, index) => sessions[index]!.removeChannel(channel)));
    }
  });
  it('stores code and latest run fields and revokes exercise access after unassignment', async () => {
    const result = await student.from('student_work').update({ code: 'print(1)', status: 'in_progress', last_run_at: new Date().toISOString(), last_run_success: false, last_error_type: 'SyntaxError', last_error_summary: 'invalid syntax' }).eq('exercise_id', exerciseId).select().single();
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ code: 'print(1)', status: 'in_progress', last_run_success: false, last_error_type: 'SyntaxError' });
    expect((await teacher.from('assignments').delete().eq('class_id', classId).eq('lesson_id', lessonId)).error).toBeNull();
    expect((await student.from('exercises').select('id').eq('id', exerciseId)).data).toEqual([]);
    expect((await student.from('student_work').update({ code: 'no access' }).eq('exercise_id', exerciseId).select()).data).toEqual([]);
    // Saved work is retained for reassignment and remains visible to its owner.
    expect((await student.from('student_work').select('code').eq('exercise_id', exerciseId)).data).toEqual([{ code: 'print(1)' }]);
  });
});
