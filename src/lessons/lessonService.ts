import type { AppSupabaseClient } from '../database/supabase';
import type { Exercise } from '../exercises/types';

export interface Lesson { id: string; title: string; exercises: Exercise[] }

export async function listLessons(client: AppSupabaseClient, classId?: string, lessonIds?: string[]): Promise<Lesson[]> {
  let ids: string[] | undefined = lessonIds;
  if (classId) {
    const assignments = await client.from('assignments').select('lesson_id').eq('class_id', classId);
    if (assignments.error) throw assignments.error;
    ids = assignments.data.map((row) => row.lesson_id);
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
