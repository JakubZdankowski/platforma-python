import type { AppSupabaseClient } from '../database/supabase';
import type { Exercise } from '../exercises/types';

export interface Lesson { id: string; title: string; exercises: Exercise[] }

export async function listLessons(client: AppSupabaseClient, classId?: string, lessonIds?: string[]): Promise<Lesson[]> {
  let ids: string[] | undefined = lessonIds;
  if (classId) {
    const modules = await client.from('group_module_assignments').select('module_id').eq('class_id', classId);
    if (modules.error) throw modules.error;
    if (!modules.data.length) return [];
    const links = await client.from('module_lessons').select('lesson_id').in('module_id', modules.data.map(m => m.module_id));
    if (links.error) throw links.error;
    const assigned = new Set(links.data.map(l => l.lesson_id));
    ids = lessonIds ? lessonIds.filter(id => assigned.has(id)) : [...assigned];
    if (!ids.length) return [];
  }
  let query = client.from('lessons').select('id, title, exercises(id, title, instructions_markdown, starter_code, runtime_type, position)').order('position').order('slug');
  if (ids) query = query.in('id', ids);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((lesson) => ({
    id: lesson.id, title: lesson.title,
    exercises: lesson.exercises.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)).map((e) => ({
      id: e.id, title: e.title, instructionsMarkdown: e.instructions_markdown,
      starterCode: e.starter_code, runtimeType: e.runtime_type as Exercise['runtimeType'],
    })),
  }));
}
