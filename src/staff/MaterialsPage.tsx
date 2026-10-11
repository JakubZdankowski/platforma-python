import { Link } from 'react-router';
import { useProfile } from '../auth/AuthProvider';
import type { AppSupabaseClient } from '../database/supabase';
import { useStaffData } from './useStaffData';
export const publicationLabels: Record<string, string> = { draft: 'Szkic', pending: 'Do zatwierdzenia', approved: 'Zatwierdzony' };
async function load(client: AppSupabaseClient) {
  const r = await client.from('lessons').select('id,title,publication_status,teacher_id').order('title');
  if (r.error) throw r.error;
  return r.data;
}
export function MaterialsPage() {
  const profile = useProfile(), admin = profile.role === 'admin', base = admin ? '/admin' : '/teacher';
  const { data, error, reload } = useStaffData(load);
  return <main className="account-page"><h1>Materiały</h1><p className="account-lead">{admin ? 'Twórz lekcje i zatwierdzaj materiały nauczycieli. Zatwierdzone lekcje dodaj do modułu, aby udostępnić je uczniom.' : 'Przygotuj lekcję w Markdown i wyślij ją administratorowi do zatwierdzenia.'}</p>
    <p><Link className="button button-primary" to={`${base}/materials/new`}>Nowa lekcja</Link>{admin && <> <Link className="button button-secondary" to="/admin/modules">Moduły i udostępnianie</Link></>}</p>
    {error && <p className="form-error" role="alert">{error}<button onClick={reload}>Ponów</button></p>}
    {!data && !error && <p role="status">Wczytywanie…</p>}
    {data && <div className="materials-list">{[...data].sort((a,b) => Number(b.publication_status === 'pending') - Number(a.publication_status === 'pending')).map(l => <Link key={l.id} className="material-link" to={`${base}/materials/${l.id}`}><span>{l.title}</span><span>{publicationLabels[l.publication_status]}</span></Link>)}{!data.length && <p>Brak materiałów.</p>}</div>}
  </main>;
}
