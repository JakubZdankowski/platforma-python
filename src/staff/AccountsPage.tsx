import { useState, type FormEvent } from 'react';
import { useStaffData } from './useStaffData';
import type { AppSupabaseClient } from '../database/supabase';
import { useProfile } from '../auth/AuthProvider';

async function load(client: AppSupabaseClient) {
  const r = await client.from('profiles').select('id,role,display_name,username').order('display_name');
  if (r.error) throw r.error;
  const emails = await client.rpc('admin_account_emails');
  if (emails.error) throw emails.error;
  return r.data.map(p => ({ ...p, email: emails.data.find(e => e.id === p.id)?.email ?? '' }));
}
export function AccountsPage() {
  const admin = useProfile().role === 'admin';
  const { client, data, error, busy, mutate, reload } = useStaffData(load);
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  async function action(body: object) {
    setPassword(null);
    return mutate(async () => {
      const r = await client.functions.invoke<{ password?: string }>('admin-accounts', { body });
      if (!r.error && r.data?.password) setPassword(r.data.password);
      return r;
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (await action(editing ? { action: 'edit', userId: editing, displayName: name, login } : { action: 'create', role, displayName: name, login })) {
      setEditing(null); setName(''); setLogin('');
    }
  }
  return <main className="account-page"><h1>{admin ? 'Konta użytkowników' : 'Uczniowie'}</h1>
    {error && <p className="form-error" role="alert">{error} <button onClick={reload}>Ponów</button></p>}
    {password && <div className="credential-notice" role="status"><strong>Hasło (widoczne tylko teraz): <span data-testid="issued-password">{password}</span></strong> <button onClick={() => setPassword(null)}>Ukryj</button></div>}
    {!data && !error && <p role="status">Wczytywanie…</p>}
    {data && <div className="staff-table"><table className="data-table"><thead><tr><th>Imię i nazwisko</th><th>Rola</th><th>Login</th>{admin && <th>Operacje</th>}</tr></thead><tbody>{data.filter(p => admin || p.role === 'student').map(p => <tr key={p.id}>
      <td>{p.display_name}</td><td>{p.role === 'admin' ? 'Administrator' : p.role === 'teacher' ? 'Nauczyciel' : 'Uczeń'}</td><td>{p.username ?? p.email ?? '—'}</td>
      {admin && <td>{p.role !== 'admin' && <div className="staff-actions"><button disabled={busy} className="button button-secondary button-small" onClick={async () => {
        setPassword(null); setEditing(p.id); setName(p.display_name); setRole(p.role); setLogin(p.username ?? p.email);
      }}>Edytuj</button><button disabled={busy} className="button button-secondary button-small" onClick={() => { if (window.confirm(`Wygenerować nowe hasło dla ${p.display_name}?`)) void action({ action: 'reset-password', userId: p.id }); }}>Nowe hasło</button>
      <button disabled={busy} className="button button-secondary button-small" onClick={() => { if (window.confirm(`Usunąć konto ${p.display_name}? Usunięcie ucznia usuwa także jego prace. Materiały i grupy nauczyciela zostaną zachowane.`)) void action({ action: 'delete', userId: p.id }); }}>Usuń</button></div>}</td>}
    </tr>)}</tbody></table></div>}
    {admin && <section className="account-section"><h2>{editing ? 'Edycja konta' : 'Nowe konto'}</h2><form className="form" onSubmit={e => void submit(e)}><fieldset disabled={busy}>
      <label className="field">Rodzaj konta<select value={role} disabled={!!editing} onChange={e => setRole(e.target.value)}><option value="student">Uczeń</option><option value="teacher">Nauczyciel</option></select></label>
      <label className="field">Imię i nazwisko<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="field">{role === 'student' ? 'Nazwa użytkownika (3–30 znaków)' : 'Adres e-mail'}<input required type={role === 'teacher' ? 'email' : 'text'} value={login} onChange={e => setLogin(e.target.value)} /></label>
      <button className="button button-primary">{editing ? 'Zapisz konto' : 'Utwórz konto'}</button>{editing && <button type="button" className="button button-secondary" onClick={() => { setEditing(null); setLogin(''); setName(''); }}>Anuluj</button>}
    </fieldset></form></section>}
  </main>;
}
