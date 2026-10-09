import type { AppSupabaseClient } from '../database/supabase';
import { listLessons, type Lesson } from '../lessons/lessonService';

export interface ModuleSummary { id: string; title: string; position: number }

export async function listModules(client: AppSupabaseClient): Promise<ModuleSummary[]> {
  const result = await client.from('modules').select('id, title, position').order('position').order('id');
  if (result.error) throw result.error;
  return result.data;
}

export async function listModuleLessons(client: AppSupabaseClient, moduleId: string): Promise<Lesson[]> {
  const links = await client.from('module_lessons').select('lesson_id, position').eq('module_id', moduleId).order('position').order('lesson_id');
  if (links.error) throw links.error;
  if (!links.data.length) return [];
  const lessons = await listLessons(client, undefined, links.data.map((l) => l.lesson_id));
  const byId = new Map(lessons.map((l) => [l.id, l]));
  return links.data.flatMap((l) => { const lesson = byId.get(l.lesson_id); return lesson ? [lesson] : []; });
}
