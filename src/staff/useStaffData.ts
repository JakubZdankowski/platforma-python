import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export function useStaffData<T>(load: (client: ReturnType<typeof useAuth>['client']) => Promise<T>) {
  const { client } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(v => v + 1), []);
  useEffect(() => {
    let active = true;
    setError('');
    void load(client).then(value => { if (active) setData(value); }).catch(() => { if (active) setError('Nie udało się wczytać danych.'); });
    return () => { active = false; };
  }, [client, load, attempt]);
  async function mutate(action: () => PromiseLike<{ error: unknown }>, optimistic?: (previous: T) => T) {
    const previous = data;
    if (data && optimistic) setData(optimistic(data));
    setBusy(true); setError('');
    try { const result = await action(); if (result.error) throw result.error; reload(); return true; }
    catch { if (optimistic) setData(previous); setError('Nie udało się zapisać zmian. Sprawdź dane i spróbuj ponownie.'); return false; }
    finally { setBusy(false); }
  }
  return { client, data, error, busy, reload, mutate, setError };
}
