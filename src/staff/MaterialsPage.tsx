import { Notice, PageHeading, EmptyState } from '../app/ui/Patterns';
import { Button, ButtonLink } from '../app/ui/Button';
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
  return <main className="account-page"><PageHeading title={<>Materiały</>} description={<>{admin ? 'Twórz lekcje i zatwierdzaj materiały nauczycieli. Zatwierdzone lekcje dodaj do modułu, aby udostępnić je uczniom.' : 'Przygotuj lekcję w Markdown i wyślij ją administratorowi do zatwierdzenia.'}</>} />
    <div className="ui-actions"><ButtonLink variant="primary" to={`${base}/materials/new`}>Nowa lekcja</ButtonLink><ButtonLink variant="secondary" to={`${base}/modules`}>Moduły</ButtonLink></div>
    {error && <Notice tone="error">{error}<Button onClick={reload}>Ponów</Button></Notice>}
    {!data && !error && <Notice>Wczytywanie…</Notice>}
    {data && <div className="materials-list">{[...data].sort((a,b) => Number(b.publication_status === 'pending') - Number(a.publication_status === 'pending')).map(l => <Link key={l.id} className="material-link" to={`${base}/materials/${l.id}`}><span>{l.title}</span><span className="publication-badge">{publicationLabels[l.publication_status]}</span></Link>)}{!data.length && <EmptyState title="Brak materiałów." />}</div>}
  </main>;
}
