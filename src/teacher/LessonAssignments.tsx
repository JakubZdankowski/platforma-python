import { useEffect, useState } from 'react';
import type { AppSupabaseClient } from '../database/supabase';
import type { Messages } from '../i18n/en';
import { listLessons, type Lesson } from '../lessons/lessonService';

export function LessonAssignments({ client, classId, messages: t }: { client: AppSupabaseClient; classId: string; messages: Messages }) {
  const [state, setState] = useState<{ lessons: Lesson[]; assigned: Set<string> } | null>(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    setState(null);
    void Promise.all([listLessons(client), client.from('assignments').select('lesson_id').eq('class_id', classId)]).then(([lessons, assignments]) => {
      if (assignments.error) throw assignments.error;
      if (active) setState({ lessons, assigned: new Set(assignments.data.map((a) => a.lesson_id)) });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [client, classId, attempt]);
  async function toggle(lessonId: string, checked: boolean) {
    if (pending) return;
    setPending(lessonId);
    setError(false);
    const wasAssigned = state?.assigned.has(lessonId) ?? false;
    const setAssigned = (assignedValue: boolean) => setState((previous) => {
      if (!previous) return previous;
      const assigned = new Set(previous.assigned);
      if (assignedValue) assigned.add(lessonId); else assigned.delete(lessonId);
      return { ...previous, assigned };
    });
    setAssigned(checked);
    try {
      const result = checked
        ? await client.from('assignments').insert({ class_id: classId, lesson_id: lessonId })
        : await client.from('assignments').delete().eq('class_id', classId).eq('lesson_id', lessonId);
      if (result.error) throw result.error;
    } catch { setAssigned(wasAssigned); setError(true); }
    finally { setPending(null); }
  }
  return <section className="account-section" aria-labelledby="lesson-assignments-heading">
    <h2 id="lesson-assignments-heading">{t.classLessons}</h2>
    {error && <div role="alert" className="form-error"><p>{state ? t.saveFailed : t.dataUnavailable}</p>
      <button type="button" className="button button-secondary button-small" onClick={() => setAttempt((a) => a + 1)}>{t.retry}</button></div>}
    {!state && !error && <p role="status">{t.loadingData}</p>}
    {state && (state.lessons.length ? <ul className="lesson-list">{state.lessons.map((lesson) => <li key={lesson.id}>
      <label><input type="checkbox" checked={state.assigned.has(lesson.id)} disabled={pending !== null}
        onChange={(event) => void toggle(lesson.id, event.target.checked)} /> {lesson.title}</label>
    </li>)}</ul> : <p className="account-muted">{t.noTeacherLessons}</p>)}
  </section>;
}
