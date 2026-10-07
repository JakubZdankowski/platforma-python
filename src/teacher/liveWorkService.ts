import { getClass, listClassStudents, type ClassDetails, type Student } from '../classes/classService';
import type { Database } from '../database/database.types';
import type { AppSupabaseClient } from '../database/supabase';

export type StudentWork = Database['public']['Tables']['student_work']['Row'];
export interface LiveExercise { id: string; title: string; lessonTitle: string }
export interface ClassSnapshot {
  details: ClassDetails;
  students: Student[];
  exercises: LiveExercise[];
  work: StudentWork[];
}

/** Re-read through RLS after each event, rather than trusting event payloads.
 * A reconnect always gets a new snapshot, including edits missed while offline. */
export async function loadClassSnapshot(client: AppSupabaseClient, classId: string): Promise<ClassSnapshot | null> {
  const details = await getClass(client, classId);
  if (!details.ok) {
    if (details.error === 'not-found') return null;
    throw new Error('Class unavailable');
  }
  const [members, exercises] = await Promise.all([
    listClassStudents(client, classId),
    client.from('exercises').select('id, title, lessons(title)'),
  ]);
  if (!members.ok || exercises.error) throw new Error('Class data unavailable');
  const ids = members.value.map((student) => student.id);
  const work = ids.length ? await client.from('student_work').select('*').in('student_id', ids) : { data: [], error: null };
  if (work.error) throw work.error;
  return { details: details.value, students: members.value, work: work.data,
    exercises: exercises.data.map((e) => ({ id: e.id, title: e.title, lessonTitle: e.lessons?.title ?? '' })) };
}

export function currentWork(rows: readonly StudentWork[], studentId: string): StudentWork | undefined {
  return rows.filter((row) => row.student_id === studentId).reduce<StudentWork | undefined>((latest, row) =>
    !latest || row.last_edited_at > latest.last_edited_at || (row.last_edited_at === latest.last_edited_at && row.exercise_id > latest.exercise_id) ? row : latest, undefined);
}

export function latestRun(rows: readonly StudentWork[], studentId: string): StudentWork | undefined {
  return rows.filter((row) => row.student_id === studentId && row.last_run_at !== null).reduce<StudentWork | undefined>((latest, row) =>
    !latest || row.last_run_at! > latest.last_run_at! ? row : latest, undefined);
}

export type Activity = { kind: 'not-started' | 'typing' | 'active' } | { kind: 'idle'; minutes: number };
export function workActivity(work: StudentWork | undefined, now: number): Activity {
  if (!work || work.status === 'not_started') return { kind: 'not-started' };
  const lastActivity = Math.max(Date.parse(work.last_edited_at), work.last_run_at ? Date.parse(work.last_run_at) : 0);
  const elapsed = Math.max(0, now - lastActivity);
  // Running a program is activity, but only a recent edit means "typing".
  if (now - Date.parse(work.last_edited_at) < 30_000) return { kind: 'typing' };
  if (elapsed < 120_000) return { kind: 'active' };
  return { kind: 'idle', minutes: Math.floor(elapsed / 60_000) };
}
