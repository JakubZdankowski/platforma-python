// Isolated UI fixture: real components and data service, deterministic client.
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { RequireRole } from '../../src/auth/RequireRole';
import { StudentHomePage } from '../../src/student/StudentHomePage';
import type { AppSupabaseClient } from '../../src/database/supabase';
import { pl } from '../../src/i18n/pl';
import logo from '../../src/assets/blue-logo.png';
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
        if (table === 'classes') data = mode === 'empty' ? [] : [{ id: 'a', name: 'Python · grupa początkująca' }, { id: 'b', name: 'Koło programistyczne' }];
        if (table === 'assignments') data = filters.class_id === 'a' ? [{ lesson_id: 'first' }] : [];
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
  <header className="site-header"><div className="site-header-inner"><div className="brand"><img className="brand-logo" src={logo} alt="Sky Blue" /><span>Kurs programowania w języku Python</span></div></div></header>
  <AuthProvider client={client}><RequireRole role="student" messages={pl}><StudentHomePage messages={pl} /></RequireRole></AuthProvider>
</MemoryRouter>);
