import { expect, test } from 'vitest';
import { sessionFixture } from './sessionFixture';
import { anonClient } from './localSupabase';
import { signInTeacher } from '../../src/auth/authService';

test('a teacher assigns and removes existing modules only in assigned groups', async () => {
  const f = await sessionFixture();
  const other = await sessionFixture();
  const teacher = anonClient();
  const student = anonClient();
  try {
    expect(await signInTeacher(teacher,f.teacherEmail,f.password)).toBeNull();
    const catalog = await teacher.rpc('group_module_catalog',{p_class_id:f.classId});
    expect(catalog.error).toBeNull();
    expect(catalog.data?.some(m=>m.id===other.moduleId)).toBe(true);
    expect((await teacher.rpc('group_module_catalog',{p_class_id:other.classId})).error).not.toBeNull();
    expect((await teacher.from('group_module_assignments').insert({class_id:other.classId,module_id:f.moduleId})).error).not.toBeNull();
    expect((await teacher.from('group_module_assignments').delete().eq('class_id',other.classId).eq('module_id',other.moduleId).select()).data).toEqual([]);
    expect((await teacher.from('group_module_assignments').insert({class_id:f.classId,module_id:other.moduleId}).select()).error).toBeNull();
    expect((await teacher.from('modules').select('id').eq('id',other.moduleId)).data).toHaveLength(1);
    expect((await teacher.from('modules').update({title:'Forbidden'}).eq('id',other.moduleId).select()).data).toEqual([]);
    expect((await student.auth.signInWithPassword({email:f.studentEmail,password:f.password})).error).toBeNull();
    await student.rpc('claim_account_session');
    expect((await student.rpc('group_module_catalog',{p_class_id:f.classId})).error).not.toBeNull();
    expect((await student.from('exercises').select('id').eq('id',other.exerciseId)).data).toHaveLength(1);
    expect((await student.from('student_work').insert({student_id:f.studentId,exercise_id:other.exerciseId,code:'print(42)'})).error).toBeNull();
    expect((await teacher.from('group_module_assignments').delete().eq('class_id',f.classId).eq('module_id',other.moduleId).select()).data).toHaveLength(1);
    expect((await student.from('exercises').select('id').eq('id',other.exerciseId)).data).toEqual([]);
    expect((await f.admin.from('student_work').select('code').eq('student_id',f.studentId).eq('exercise_id',other.exerciseId)).data).toEqual([{code:'print(42)'}]);
    expect((await f.admin.from('group_module_assignments').select('class_id').eq('class_id',other.classId).eq('module_id',other.moduleId)).data).toHaveLength(1);
    await f.admin.from('class_teachers').delete().eq('class_id',f.classId).eq('teacher_id',f.teacherId);
    expect((await teacher.rpc('group_module_catalog',{p_class_id:f.classId})).error).not.toBeNull();
    expect((await teacher.from('group_module_assignments').insert({class_id:f.classId,module_id:other.moduleId})).error).not.toBeNull();
    expect((await teacher.from('group_module_assignments').delete().eq('class_id',f.classId).eq('module_id',f.moduleId).select()).data).toEqual([]);
  } finally { await teacher.auth.signOut(); await student.auth.signOut(); await f.cleanup(); await other.cleanup(); }
});
