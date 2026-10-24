import type { AppSupabaseClient } from '../../src/database/supabase';

/** Explicit content setup: a group is never implicitly converted into a module. */
export async function assignLessonModule(client: AppSupabaseClient, classId: string, lessonId: string) {
  const owner = await client.from('lessons').select('teacher_id').eq('id', lessonId).single();
  if (owner.error) throw owner.error;
  const module = await client.from('modules').insert({ teacher_id: owner.data.teacher_id, title: 'Moduł testowy' }).select('id').single();
  if (module.error) throw module.error;
  const lesson = await client.from('module_lessons').insert({ module_id: module.data.id, lesson_id: lessonId });
  if (lesson.error) throw lesson.error;
  const assigned = await client.from('group_module_assignments').insert({ class_id: classId, module_id: module.data.id });
  if (assigned.error) throw assigned.error;
  return module.data.id;
}
