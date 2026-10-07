import type { AppSupabaseClient } from '../database/supabase';
import type { Exercise } from '../exercises/types';

export interface Lesson { id: string; title: string; exercises: Exercise[] }

export async function listLessons(client: AppSupabaseClient): Promise<Lesson[]> {
  const { data, error } = await client.from('lessons').select('id, title, exercises(id, title, instructions_markdown, starter_code, runtime_type, position)').order('position').order('slug');
  if (error) throw error;
  return data.map((lesson) => ({
    id: lesson.id, title: lesson.title,
    exercises: lesson.exercises.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)).map((e) => ({
      id: e.id, title: e.title, instructionsMarkdown: e.instructions_markdown,
      starterCode: e.starter_code, runtimeType: e.runtime_type as Exercise['runtimeType'],
    })),
  }));
}
