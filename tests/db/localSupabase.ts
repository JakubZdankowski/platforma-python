import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import type { AppSupabaseClient } from '../../src/database/supabase';
import type { Database } from '../../src/database/database.types';

// Helpers for tests that run against the local Supabase stack
// (`pnpm supabase start` + `pnpm supabase db reset`).

interface LocalKeys {
  url: string;
  publishableKey: string;
  serviceKey: string;
}

let keys: LocalKeys | null = null;

export function localKeys(): LocalKeys {
  if (keys) return keys;
  let status: Record<string, string>;
  try {
    status = JSON.parse(execSync('pnpm exec supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) as Record<string, string>;
  } catch {
    throw new Error('Local Supabase is not running. Start it with `pnpm supabase start` and reset it with `pnpm supabase db reset`.');
  }
  const url = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const serviceKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !serviceKey) throw new Error('Unexpected `supabase status` output');
  keys = { url, publishableKey, serviceKey };
  return keys;
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** A fresh browser-like client (publishable key, no shared session). */
export function anonClient(): AppSupabaseClient {
  const { url, publishableKey } = localKeys();
  return createClient<Database>(url, publishableKey, noSession);
}

/** Test setup only — the service key never reaches the browser app. */
export function adminClient(): AppSupabaseClient {
  const { url, serviceKey } = localKeys();
  return createClient<Database>(url, serviceKey, noSession);
}

export const SEED = {
  teacher: { email: 'teacher@example.test', password: 'teacher-dev-password' },
  joinCode: 'PYTHON25',
  className: 'Python 101',
  students: ['ania', 'kuba', 'ola'] as const,
  password: (username: string) => `${username}-dev-pass`,
};
