import { useEffect, useState } from 'react';
import type { AppSupabaseClient } from '../database/supabase';
import { loadClassSnapshot, type ClassSnapshot } from './liveWorkService';

export type LiveConnection = 'connecting' | 'live' | 'disconnected';
type State = { status: 'loading' } | { status: 'error' } | { status: 'not-found' } | { status: 'ready'; snapshot: ClassSnapshot };

export function useLiveClass(client: AppSupabaseClient, classId: string) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [connection, setConnection] = useState<LiveConnection>('connecting');
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let subscribed = false;
    let awaitingSubscription = true;
    let loading = false;
    let requested = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setConnection('connecting');
    // Serialize snapshots. An event during a read schedules another read, so
    // an older snapshot can never replace the last event's saved state.
    async function refresh() {
      requested = true;
      if (loading || !active) return;
      loading = true;
      clearTimeout(retryTimer);
      try {
        while (requested && active) {
          requested = false;
          const snapshot = await loadClassSnapshot(client, classId);
          if (!active) return;
          setState(snapshot ? { status: 'ready', snapshot } : { status: 'not-found' });
          setRefreshFailed(false);
        }
        if (active) setConnection(awaitingSubscription ? 'connecting' : subscribed ? 'live' : 'disconnected');
      } catch {
        if (!active) return;
        setRefreshFailed(true);
        setConnection('disconnected');
        setState((previous) => previous.status === 'ready' ? previous : { status: 'error' });
        retryTimer = setTimeout(() => { void refresh(); }, 3000);
      } finally { loading = false; }
    }
    const channel = client.channel(`class-work-${classId}-${crypto.randomUUID()}`, {
      config: { postgres_changes_options: { wait: true } },
    })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_work' }, () => { void refresh(); })
      .subscribe((status) => {
        if (!active) return;
        awaitingSubscription = false;
        subscribed = status === 'SUBSCRIBED';
        if (subscribed) {
          setConnection('connecting');
          void refresh();
        } else setConnection('disconnected');
      });
    void refresh();
    const offline = () => { awaitingSubscription = false; subscribed = false; setConnection('disconnected'); };
    const online = () => setAttempt((value) => value + 1);
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      active = false;
      clearTimeout(retryTimer);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      void client.removeChannel(channel);
    };
  }, [client, classId, attempt]);
  return { state, connection, refreshFailed, retry: () => setAttempt((value) => value + 1) };
}
