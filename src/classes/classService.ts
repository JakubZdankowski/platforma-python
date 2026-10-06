import { FunctionsHttpError } from '@supabase/supabase-js';
import type { AppSupabaseClient } from '../database/supabase';

// Data access for classes and class membership. RLS decides what each
// query may see or change; these functions only shape requests and results.

export type ServiceError = 'unavailable' | 'not-found' | 'username-taken' | 'invalid-input' | 'forbidden';
export type Result<T> = { ok: true; value: T } | { ok: false; error: ServiceError };

export interface ClassSummary {
  id: string;
  name: string;
  joinCode: string;
  studentCount: number;
}

export interface ClassDetails {
  id: string;
  name: string;
  joinCode: string;
}

export interface Student {
  id: string;
  displayName: string;
  username: string;
}

export interface NewStudentCredentials {
  studentId: string;
  username: string;
  password: string;
}

function failure(context: string, message: string | undefined): { ok: false; error: ServiceError } {
  // Technical details go to the developer console only.
  console.error(`${context} failed`, message);
  return { ok: false, error: 'unavailable' };
}

export async function listTeacherClasses(client: AppSupabaseClient, teacherId: string): Promise<Result<ClassSummary[]>> {
  const { data, error } = await client
    .from('classes')
    .select('id, name, join_code, class_members(count)')
    .eq('teacher_id', teacherId)
    .order('created_at');
  if (error) return failure('Loading classes', error.message);
  return {
    ok: true,
    value: data.map((row) => ({
      id: row.id,
      name: row.name,
      joinCode: row.join_code,
      studentCount: row.class_members[0]?.count ?? 0,
    })),
  };
}

/** Classes of the signed-in student (RLS returns only their own memberships). */
export async function listStudentClasses(client: AppSupabaseClient): Promise<Result<{ id: string; name: string }[]>> {
  const { data, error } = await client.from('classes').select('id, name').order('name');
  if (error) return failure('Loading classes', error.message);
  return { ok: true, value: data };
}

export async function createClass(client: AppSupabaseClient, name: string): Promise<Result<string>> {
  const { data, error } = await client.from('classes').insert({ name }).select('id').single();
  if (error) return failure('Creating class', error.message);
  return { ok: true, value: data.id };
}

export async function getClass(client: AppSupabaseClient, classId: string): Promise<Result<ClassDetails>> {
  const { data, error } = await client.from('classes').select('id, name, join_code').eq('id', classId).maybeSingle();
  if (error) return failure('Loading class', error.message);
  if (!data) return { ok: false, error: 'not-found' };
  return { ok: true, value: { id: data.id, name: data.name, joinCode: data.join_code } };
}

export async function renameClass(client: AppSupabaseClient, classId: string, name: string): Promise<Result<null>> {
  const { data, error } = await client.from('classes').update({ name }).eq('id', classId).select('id');
  if (error) return failure('Renaming class', error.message);
  if (data.length === 0) return { ok: false, error: 'not-found' };
  return { ok: true, value: null };
}

export async function listClassStudents(client: AppSupabaseClient, classId: string): Promise<Result<Student[]>> {
  const { data, error } = await client
    .from('class_members')
    .select('student_id, profiles(display_name, username)')
    .eq('class_id', classId);
  if (error) return failure('Loading class members', error.message);
  return { ok: true, value: sortStudents(data.flatMap((row) => (row.profiles ? [toStudent(row.student_id, row.profiles)] : []))) };
}

/** All student accounts created by the teacher, in any class. */
export async function listTeacherStudents(client: AppSupabaseClient, teacherId: string): Promise<Result<Student[]>> {
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, username')
    .eq('created_by', teacherId)
    .eq('role', 'student');
  if (error) return failure('Loading students', error.message);
  return { ok: true, value: sortStudents(data.map((row) => toStudent(row.id, row))) };
}

export async function addClassMember(client: AppSupabaseClient, classId: string, studentId: string): Promise<Result<null>> {
  const { error } = await client.from('class_members').insert({ class_id: classId, student_id: studentId });
  if (error) return failure('Adding class member', error.message);
  return { ok: true, value: null };
}

export async function removeClassMember(client: AppSupabaseClient, classId: string, studentId: string): Promise<Result<null>> {
  const { error } = await client.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId);
  if (error) return failure('Removing class member', error.message);
  return { ok: true, value: null };
}

export async function createStudent(
  client: AppSupabaseClient,
  classId: string,
  username: string,
  displayName: string,
): Promise<Result<NewStudentCredentials>> {
  return invokeStudentFunction<NewStudentCredentials>(client, { action: 'create', classId, username, displayName });
}

export async function resetStudentPassword(client: AppSupabaseClient, studentId: string): Promise<Result<{ studentId: string; password: string }>> {
  return invokeStudentFunction(client, { action: 'reset-password', studentId });
}

async function invokeStudentFunction<T>(client: AppSupabaseClient, body: Record<string, string>): Promise<Result<T>> {
  const { data, error } = await client.functions.invoke<T>('teacher-students', { body });
  if (!error && data) return { ok: true, value: data };
  if (error instanceof FunctionsHttpError) {
    const code = await errorCode(error.context);
    if (code === 'username-taken' || code === 'not-found' || code === 'invalid-input' || code === 'forbidden') {
      return { ok: false, error: code };
    }
  }
  return failure('Student account request', error instanceof Error ? error.message : 'empty response');
}

async function errorCode(response: unknown): Promise<string | null> {
  if (!(response instanceof Response)) return null;
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : null;
  } catch {
    return null;
  }
}

function toStudent(id: string, row: { display_name: string; username: string | null }): Student {
  return { id, displayName: row.display_name, username: row.username ?? '' };
}

function sortStudents(students: Student[]): Student[] {
  return students.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl') || a.username.localeCompare(b.username));
}
