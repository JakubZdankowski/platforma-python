import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminClient, anonClient } from './localSupabase';
import { signInTeacher, signInStudentAccount } from '../../src/auth/authService';
import type { AppSupabaseClient } from '../../src/database/supabase';

const service = adminClient(), suffix = Date.now().toString(36), password = `roles-${suffix}-password`;
const ids: string[] = [];
let admin: AppSupabaseClient, teacher: AppSupabaseClient, other: AppSupabaseClient, student: AppSupabaseClient;
let adminId: string, teacherId: string, studentId: string, classId: string, moduleId: string, lessonId: string, exerciseId: string;
const payload = [{ title: 'Pierwsze zadanie', markdown: '## Wypisz imię', code: 'print("Cześć")', runtime: 'python-console' }];
async function staff(role: 'admin' | 'teacher', name: string) {
  const email = `${name}-${suffix}@example.test`;
  const r = await service.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role, display_name: name } });
  if (r.error) throw r.error;
  ids.push(r.data.user.id);
  const client = anonClient(); expect(await signInTeacher(client,email,password)).toBeNull();
  return { id: r.data.user.id, client };
}
beforeAll(async () => {
  const a = await staff('admin','admin-roles'); admin=a.client; adminId=a.id;
  const t = await staff('teacher','teacher-roles'); teacher=t.client; teacherId=t.id;
  other=(await staff('teacher','other-roles')).client;
  const username = `roles-${suffix}`;
  const s = await service.auth.admin.createUser({ email: `${username}.${adminId.replaceAll('-','')}@students.invalid`, password, email_confirm:true,
    app_metadata: { role:'student',username,display_name:'Uczeń ról',created_by:adminId } });
  if (s.error) throw s.error;
  studentId=s.data.user.id; ids.push(studentId); student=anonClient(); expect(await signInStudentAccount(student,username,password)).toBeNull();
  const c = await admin.from('classes').insert({ name:`Grupa ról ${suffix}` }).select('id').single(); expect(c.error).toBeNull(); classId=c.data!.id;
  expect((await admin.from('class_teachers').insert({ class_id:classId,teacher_id:teacherId })).error).toBeNull();
  expect((await admin.from('class_members').insert({ class_id:classId,student_id:studentId })).error).toBeNull();
  const m = await admin.from('modules').insert({ title:`Moduł ról ${suffix}` }).select('id').single(); expect(m.error).toBeNull(); moduleId=m.data!.id;
  expect((await admin.from('group_module_assignments').insert({ class_id:classId,module_id:moduleId })).error).toBeNull();
});
afterAll(async () => { for (const id of ids.reverse()) await service.auth.admin.deleteUser(id); });
describe('three account roles', () => {
  it('admin sees all users; teachers only see assigned groups and students', async () => {
    expect((await admin.from('profiles').select('id').eq('id',studentId)).data).toHaveLength(1);
    expect((await teacher.from('classes').select('id').eq('id',classId)).data).toHaveLength(1);
    expect((await teacher.from('profiles').select('id').eq('id',studentId)).data).toHaveLength(1);
    expect((await other.from('profiles').select('id').eq('id',studentId)).data).toEqual([]);
    expect((await other.from('classes').select('id').eq('id',classId)).data).toEqual([]);
    expect((await student.from('classes').select('id')).data).toEqual([]);
  });
  it('teachers cannot create groups, enroll students, assign teachers or share modules', async () => {
    expect((await teacher.from('classes').insert({ name:'Forbidden' })).error).not.toBeNull();
    expect((await teacher.from('class_members').insert({ class_id:classId,student_id:studentId })).error).not.toBeNull();
    expect((await teacher.from('class_teachers').insert({ class_id:classId,teacher_id:teacherId })).error).not.toBeNull();
    expect((await teacher.from('student_module_assignments').insert({ module_id:moduleId,student_id:studentId })).error).not.toBeNull();
    const renamed = await teacher.from('classes').update({ name:'Forbidden' }).eq('id',classId).select('id');
    expect(renamed.data ?? []).toEqual([]);
  });
  it('teacher drafts are private and cannot be approved or assigned by the teacher', async () => {
    const r=await teacher.rpc('save_material',{ p_lesson_id:null,p_title:'Lekcja ról',p_exercises:payload,p_status:'draft' }); expect(r.error).toBeNull(); lessonId=r.data!;
    const e=await teacher.from('exercises').select('id').eq('lesson_id',lessonId).single(); exerciseId=e.data!.id;
    expect((await student.from('lessons').select('id').eq('id',lessonId)).data).toEqual([]);
    const failed=await teacher.rpc('save_material',{p_lesson_id:lessonId,p_title:'Nie zapisuj',p_status:'draft',p_exercises:[
      {id:exerciseId,title:'Nie zapisuj',markdown:'Nie zapisuj',code:'',runtime:'python-console'},
      {title:'Błędne',markdown:'Błędne',code:'',runtime:'invalid'},
    ]});
    expect(failed.error).not.toBeNull();
    expect((await teacher.from('exercises').select('instructions_markdown').eq('id',exerciseId).single()).data?.instructions_markdown).toBe('## Wypisz imię');
    expect((await other.from('lessons').select('id').eq('id',lessonId)).data).toEqual([]);
    expect((await teacher.rpc('save_material',{ p_lesson_id:lessonId,p_title:'Hack',p_exercises:payload,p_status:'approved' })).error).not.toBeNull();
    expect((await teacher.from('lessons').update({ publication_status:'approved' }).eq('id',lessonId)).error).not.toBeNull();
    expect((await admin.from('module_lessons').insert({ module_id:moduleId,lesson_id:lessonId })).error).not.toBeNull();
  });
  it('pending exercises are frozen until the admin returns the draft', async () => {
    expect((await teacher.from('lessons').update({ publication_status:'pending' }).eq('id',lessonId)).error).toBeNull();
    expect((await teacher.from('lessons').update({title:'Ukryta zmiana'}).eq('id',lessonId).select('id')).data).toEqual([]);
    const edit=await teacher.from('exercises').update({ instructions_markdown:'Hidden edit' }).eq('id',exerciseId).select('id'); expect(edit.data ?? []).toEqual([]);
    expect((await admin.from('lessons').update({ publication_status:'draft' }).eq('id',lessonId)).error).toBeNull();
    expect((await teacher.from('exercises').update({ instructions_markdown:'Poprawiona instrukcja' }).eq('id',exerciseId).select('id')).data).toHaveLength(1);
    expect((await teacher.from('lessons').update({ publication_status:'pending' }).eq('id',lessonId)).error).toBeNull();
  });
  it('approved materials become visible after admin assignment; live code is read-only for staff', async () => {
    expect((await admin.from('lessons').update({ publication_status:'approved' }).eq('id',lessonId)).error).toBeNull();
    expect((await admin.from('module_lessons').insert({ module_id:moduleId,lesson_id:lessonId })).error).toBeNull();
    expect((await student.from('exercises').select('id').eq('id',exerciseId)).data).toHaveLength(1);
    expect((await student.from('student_work').insert({ student_id:studentId,exercise_id:exerciseId,code:'print("live")' })).error).toBeNull();
    expect((await teacher.from('student_work').select('code').eq('student_id',studentId)).data).toEqual([{ code:'print("live")' }]);
    expect((await other.from('student_work').select('code').eq('student_id',studentId)).data).toEqual([]);
    expect((await teacher.from('student_work').update({ code:'Hack' }).eq('student_id',studentId).select('code')).data).toEqual([]);
    expect((await teacher.from('lessons').update({ publication_status:'draft' }).eq('id',lessonId).select('id')).data).toEqual([]);
  });
  it('removing teacher membership immediately revokes access to student code', async () => {
    expect((await admin.from('class_teachers').delete().eq('class_id',classId).eq('teacher_id',teacherId)).error).toBeNull();
    expect((await teacher.from('student_work').select('code').eq('student_id',studentId)).data).toEqual([]);
    expect((await teacher.from('profiles').select('id').eq('id',studentId)).data).toEqual([]);
  });
  it('only admin manages accounts, and changed student login keeps their work', async () => {
    expect((await teacher.functions.invoke('admin-accounts',{ body:{action:'delete',userId:studentId} })).error).not.toBeNull();
    const username=`renamed-${suffix}`;
    expect((await admin.functions.invoke('admin-accounts',{body:{action:'edit',userId:studentId,displayName:'Nowe imię',login:username}})).error).toBeNull();
    const replacement=anonClient(); expect(await signInStudentAccount(replacement,username,password)).toBeNull();
    expect((await replacement.from('student_work').select('code').eq('exercise_id',exerciseId)).data).toEqual([{code:'print("live")'}]);
    await replacement.auth.signOut();
  });
  it('deleting a teacher preserves their approved materials and student work', async () => {
    const slug=(await service.from('lessons').select('slug').eq('id',lessonId).single()).data!.slug;
    expect((await service.from('lessons').insert({teacher_id:adminId,slug,title:'Konflikt slugów',publication_status:'approved'})).error).toBeNull();
    expect((await admin.functions.invoke('admin-accounts',{body:{action:'delete',userId:teacherId}})).error).toBeNull();
    expect((await admin.from('lessons').select('teacher_id').eq('id',lessonId).single()).data).toEqual({teacher_id:adminId});
    expect((await admin.from('student_work').select('code').eq('exercise_id',exerciseId)).data).toEqual([{code:'print("live")'}]);
  });
});
