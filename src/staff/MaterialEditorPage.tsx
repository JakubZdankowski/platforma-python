import { Notice } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';
import { publicationLabels } from './MaterialsPage';
import type { Json } from '../database/database.types';

interface ExerciseDraft { id?: string; title: string; markdown: string; code: string; runtime: string }
const emptyExercise = (): ExerciseDraft => ({ title: 'Nowe ćwiczenie', markdown: '## Zadanie\n\nNapisz program, który wypisze Twoje imię.\n\n> Wskazówka: użyj `print()`.', code: 'print("Cześć!")', runtime: 'python-console' });
export function MaterialEditorPage() {
  const { lessonId = 'new' } = useParams();
  return <MaterialEditor key={lessonId} lessonId={lessonId} />;
}
function MaterialEditor({ lessonId }: { lessonId: string }) {
  const { client } = useAuth(), profile = useProfile(), navigate = useNavigate();
  const admin = profile.role === 'admin', base = admin ? '/admin' : '/teacher';
  const [id, setId] = useState(lessonId === 'new' ? null : lessonId);
  const [title, setTitle] = useState('');
  const [exercises, setExercises] = useState<ExerciseDraft[]>([emptyExercise()]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState('draft');
  const [owner, setOwner] = useState(profile.id);
  const [loading, setLoading] = useState(lessonId !== 'new');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (lessonId === 'new') return;
    let active = true;
    setLoading(true); setError('');
    void (async () => {
      const [l,e] = await Promise.all([client.from('lessons').select('*').eq('id', lessonId).maybeSingle(), client.from('exercises').select('*').eq('lesson_id', lessonId).order('position')]);
      if (l.error || e.error || !l.data) throw new Error('unavailable');
      if (!active) return;
      setTitle(l.data.title); setStatus(l.data.publication_status); setOwner(l.data.teacher_id);
      setExercises(e.data.length ? e.data.map(x => ({ id: x.id, title: x.title, markdown: x.instructions_markdown, code: x.starter_code, runtime: x.runtime_type })) : [emptyExercise()]);
      setDirty(false);
    })().catch(() => { if (active) setError('Nie udało się wczytać lekcji lub nie masz do niej dostępu.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, lessonId, attempt]);
  useEffect(() => {
    const leaving = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    const navigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (dirty && anchor instanceof HTMLAnchorElement && anchor.target !== '_blank' && anchor.href !== window.location.href
        && !window.confirm('Opuścić edytor bez zapisania zmian?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('click', navigation, true);
    window.addEventListener('beforeunload', leaving);
    return () => { window.removeEventListener('beforeunload', leaving); window.removeEventListener('click', navigation, true); };
  }, [dirty]);
  const editable = !loading && !error && (admin || owner === profile.id && status === 'draft');
  function update(patch: Partial<ExerciseDraft>) { setDirty(true); setNotice(''); setExercises(prev => prev.map((x,i) => i === selected ? { ...x,...patch } : x)); }
  function insert(before: string, after = '') {
    const input = textarea.current;
    if (!input) return;
    const start = input.selectionStart, end = input.selectionEnd, markdown = exercises[selected]!.markdown;
    update({ markdown: markdown.slice(0,start) + before + markdown.slice(start,end) + after + markdown.slice(end) });
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + before.length, end + before.length); });
  }
  async function save(nextStatus: string) {
    if (status === 'approved' && nextStatus === 'draft' && !window.confirm('Przywrócić lekcję do szkicu? Uczniowie stracą dostęp do ponownego zatwierdzenia.')) return;
    if (!title.trim() || exercises.some(x => !x.title.trim() || !x.markdown.trim())) { setNotice('Uzupełnij tytuł lekcji, tytuły ćwiczeń i instrukcje.'); return; }
    setBusy(true); setNotice('');
    try {
      const payload = exercises.map(x => ({ id: x.id ?? null, title: x.title.trim(), markdown: x.markdown, code: x.code, runtime: x.runtime })) as Json;
      const r = await client.rpc('save_material', { p_lesson_id: id, p_title: title.trim(), p_exercises: payload, p_status: nextStatus });
      if (r.error) throw r.error;
      setDirty(false); setId(r.data); setStatus(nextStatus); setNotice(nextStatus === 'pending' ? 'Wysłano do zatwierdzenia.' : nextStatus === 'approved' ? 'Lekcja zatwierdzona. Możesz dodać ją do modułu.' : 'Zapisano szkic.');
      if (lessonId !== r.data) void navigate(`${base}/materials/${r.data}`, { replace: true });
      else setAttempt(v => v + 1);
    } catch { setNotice('Nie udało się zapisać lekcji. Twoje zmiany pozostały w edytorze.'); }
    finally { setBusy(false); }
  }
  return <main className="account-page material-author"><Link to={`${base}/materials`}>← Materiały</Link><h1>{lessonId === 'new' ? 'Nowa lekcja' : title}</h1>
    {loading && <Notice>Wczytywanie…</Notice>}
    {error && <Notice tone="error">{error}<Button onClick={() => setAttempt(v => v + 1)}>Ponów</Button></Notice>}
    {!loading && !error && <><p>Status: <strong>{publicationLabels[status]}</strong></p>
      {!admin && status === 'pending' && <p>Materiał czeka na decyzję administratora. Edycja będzie dostępna po zwrocie do poprawy.</p>}
      {!admin && status === 'approved' && <p>Zatwierdzona lekcja jest dostępna do odczytu. Możesz utworzyć nową lekcję na jej podstawie.</p>}
      <fieldset disabled={busy} className="module-editor-fields">
        <label className="field">Tytuł lekcji<input required maxLength={200} readOnly={!editable} value={title} onChange={e => { setTitle(e.target.value); setDirty(true); }} /></label>
        <div className="staff-actions">{exercises.map((x,i) => <Button variant="secondary" type="button" className="exercise-tab" key={i} onClick={() => setSelected(i)} aria-pressed={selected === i}>{i+1}. {x.title}</Button>)}{editable && <Button variant="secondary" onClick={() => { setExercises(prev => [...prev,emptyExercise()]); setSelected(exercises.length); setDirty(true); }}>+ Ćwiczenie</Button>}</div>
        {exercises[selected] && <>
          <label className="field">Tytuł ćwiczenia<input maxLength={200} readOnly={!editable} value={exercises[selected]!.title} onChange={e => update({ title: e.target.value })} /></label>
          <label className="field">Środowisko<select disabled={!editable} value={exercises[selected]!.runtime} onChange={e => update({ runtime: e.target.value })}><option value="python-console">Python — konsola</option><option value="python-turtle">Python — żółw</option></select></label>
          <p className="account-muted">Markdown: nagłówki, listy, linki i bloki kodu. Podgląd aktualizuje się podczas pisania.</p>
          {editable && <div className="staff-actions markdown-toolbar" aria-label="Formatowanie Markdown"><Button size="compact" onClick={() => insert('## ')}>Nagłówek</Button><Button size="compact" onClick={() => insert('**','**')}>Pogrubienie</Button><Button size="compact" onClick={() => insert('- ')}>Lista</Button><Button size="compact" onClick={() => insert('```python\n','\n```')}>Kod Python</Button><Button size="compact" onClick={() => insert('> ')}>Wskazówka</Button></div>}
          <div className="markdown-editor-grid"><label className="field">Instrukcja Markdown<textarea ref={textarea} readOnly={!editable} rows={18} value={exercises[selected]!.markdown} onChange={e => update({ markdown: e.target.value })} /></label><section className="markdown-preview" aria-label="Podgląd instrukcji"><h2>Podgląd</h2><MarkdownInstructions markdown={exercises[selected]!.markdown} /></section></div>
          <label className="field">Kod początkowy ucznia<textarea rows={5} readOnly={!editable} value={exercises[selected]!.code} onChange={e => update({ code: e.target.value })} /></label>
        </>}
        <div className="staff-actions">{editable && <><Button variant="secondary" onClick={() => void save('draft')}>Zapisz szkic</Button><Button variant="primary" onClick={() => void save(admin ? 'approved' : 'pending')}>{admin ? 'Zatwierdź i zapisz' : 'Wyślij do zatwierdzenia'}</Button></>}
        {admin && status === 'pending' && <Button variant="secondary" onClick={() => void save('draft')}>Zwróć do poprawy</Button>}
        {!admin && status === 'approved' && <Button variant="secondary" onClick={() => { setId(null); setStatus('draft'); setOwner(profile.id); setExercises(prev => prev.map(x => ({ ...x,id: undefined }))); setTitle(title + ' — kopia'); setDirty(true); }}>Utwórz kopię do edycji</Button>}</div>
      </fieldset><p role="status">{busy ? 'Zapisywanie…' : notice}{dirty && !busy && ' Niezapisane zmiany.'}</p>
    </>}
  </main>;
}
