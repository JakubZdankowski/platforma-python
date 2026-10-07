import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSupabaseClient } from '../database/supabase';
import { supabaseConfig } from '../database/supabase';
import type { Exercise } from '../exercises/types';
import type { ExecutionResult } from '../runtime/protocol';
import { WorkAutosaver, type SaveStatus, type WorkPatch } from './WorkAutosaver';

type State = { status: 'loading' | 'error' } | { status: 'ready'; code: string; save: SaveStatus };

export function useStudentWork(client: AppSupabaseClient, studentId: string, exercise: Exercise) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const saver = useRef<WorkAutosaver | null>(null);

  useEffect(() => {
    let active = true;
    let writer: WorkAutosaver | null = null;
    let token: string | null = null;
    const { data: auth } = client.auth.onAuthStateChange((_event, session) => { token = session?.access_token ?? null; });
    setState({ status: 'loading' });
    const flush = () => { void writer?.flush(); };
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', visibility);
    void (async () => {
      const session = await client.auth.getSession();
      token = session.data.session?.access_token ?? null;
      let result = await client.from('student_work').select('code, status').eq('student_id', studentId).eq('exercise_id', exercise.id).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) {
        const created = await client.from('student_work').insert({ student_id: studentId, exercise_id: exercise.id, code: exercise.starterCode });
        // Another tab may have initialized the row while we were loading.
        if (created.error && created.error.code !== '23505') throw created.error;
        result = await client.from('student_work').select('code, status').eq('student_id', studentId).eq('exercise_id', exercise.id).single();
        if (result.error) throw result.error;
      }
      if (!active || !result.data) return;
      const write = async (patch: WorkPatch) => {
        const config = supabaseConfig();
        if (!config || !token) throw new Error('No session');
        // keepalive allows the final small request to finish during pagehide.
        // RLS still uses the student's JWT, exactly as Supabase client requests do.
        const body = JSON.stringify(patch);
        const response = await fetch(`${config.url}/rest/v1/student_work?student_id=eq.${encodeURIComponent(studentId)}&exercise_id=eq.${encodeURIComponent(exercise.id)}`, {
          method: 'PATCH', keepalive: new TextEncoder().encode(body).length < 60_000,
          headers: { apikey: config.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body,
        });
        if (!response.ok) throw new Error('Save failed');
        const rows: unknown = await response.json();
        if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Work is no longer writable');
      };
      writer = new WorkAutosaver(result.data.code, result.data.status as WorkPatch['status'], write, (save) => {
        if (active) setState((previous) => previous.status === 'ready' ? { ...previous, save } : previous);
      });
      saver.current = writer;
      setState({ status: 'ready', code: result.data.code, save: 'saved' });
    })().catch(() => { if (active) setState({ status: 'error' }); });
    return () => {
      active = false;
      writer?.dispose();
      saver.current = null;
      auth.subscription.unsubscribe();
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [client, studentId, exercise.id, exercise.starterCode, attempt]);

  const change = useCallback((code: string) => {
    setState((previous) => previous.status === 'ready' ? { ...previous, code, save: 'saving' } : previous);
    saver.current?.change(code);
  }, []);
  const flush = useCallback(() => saver.current?.flush() ?? Promise.resolve(false), []);
  const recordRun = useCallback((result: ExecutionResult) => saver.current?.recordRun(result), []);
  return { state, change, flush, recordRun, retry: () => setAttempt((value) => value + 1) };
}
