import { useCallback, useEffect, useState } from 'react';
import type { AppSupabaseClient } from '../database/supabase';
import { getClass, listClassStudents, listTeacherStudents, type ClassDetails, type Student } from '../classes/classService';

export type ClassData =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'ready'; details: ClassDetails; members: Student[]; allStudents: Student[] };

/** Loads a class, its members and the teacher's other students. `reload` keeps the current data on screen. */
export function useClassData(client: AppSupabaseClient, teacherId: string, classId: string) {
  const [data, setData] = useState<ClassData>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getClass(client, classId),
      listClassStudents(client, classId),
      listTeacherStudents(client, teacherId),
    ]).then(([details, members, allStudents]) => {
      if (!active) return;
      if (!details.ok) setData({ status: details.error === 'not-found' ? 'not-found' : 'error' });
      else if (!members.ok || !allStudents.ok) setData({ status: 'error' });
      else setData({ status: 'ready', details: details.value, members: members.value, allStudents: allStudents.value });
    });
    return () => { active = false; };
  }, [client, teacherId, classId, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { data, reload };
}
