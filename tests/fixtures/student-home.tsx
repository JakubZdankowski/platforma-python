// Isolated UI fixture: real components and data service, deterministic client.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { SessionHome } from '../../src/app/AccountApp';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { RequireRole } from '../../src/auth/RequireRole';
import { StudentHomePage } from '../../src/student/StudentHomePage';
import type { AppSupabaseClient } from '../../src/database/supabase';
import { pl } from '../../src/i18n/pl';
import { DashboardLayout } from '../../src/app/DashboardLayout';
import '../../src/app/styles.css';

const mode = new URLSearchParams(location.search).get('mode');
let failed = false;
const client = {
  auth: {
    onAuthStateChange(callback: (event: string, session: unknown) => void) {
      queueMicrotask(() => callback('SIGNED_IN', { user: { id: 'student' } }));
      return { data: { subscription: { unsubscribe() {} } } };
    },
    getSession: async () => ({ data: { session: null } }),
  },
  rpc: async () => ({ data: true, error: null }),
  from(table: string) {
    const filters: Record<string, unknown> = {};
    const query = {
      select() { return query; }, order() { return query; },
      eq(key: string, value: unknown) { filters[key] = value; return query; },
      in(key: string, value: unknown) { filters[key] = value; return query; },
      maybeSingle() { return Promise.resolve({ data: { id: 'student', role: 'student', display_name: 'Ania', username: 'ania' }, error: null }); },
      then(resolve: (value: unknown) => void) {
        let data: unknown = [];
        if (table === 'modules') data = mode === 'empty' ? [] : [{ id: 'a', title: '1. Podstawy Pythona', position: 0 }, { id: 'b', title: '2. Programowanie obiektowe', position: 1 }];
        if (table === 'module_lessons') data = filters.module_id === 'a' ? [{ lesson_id: 'first', position: 0 }] : [];
        if (table === 'lessons') {
          if (mode === 'error' && !failed) { failed = true; return Promise.resolve({ data: null, error: new Error('offline') }).then(resolve); }
          data = ['first', 'other'].filter((id) => (filters.id as string[]).includes(id)).map((id) => ({ id, title: id === 'first' ? 'Pierwsze kroki w Pythonie' : 'Inna klasa', exercises: [{ id: 'hello', title: 'Powitanie', position: 0, instructions_markdown: '', starter_code: '', runtime_type: 'python-console' }] }));
        }
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    };
    return query;
  },
} as unknown as AppSupabaseClient;
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/student']}>
  <AuthProvider client={client}><Routes>
    <Route path="/" element={<SessionHome messages={pl} />} />
    <Route path="/student" element={<RequireRole role="student" messages={pl}><DashboardLayout /></RequireRole>}><Route index element={<StudentHomePage messages={pl} />} /><Route path="materials" element={<StudentHomePage messages={pl} materials />} /></Route>
  </Routes></AuthProvider>
</MemoryRouter>);
