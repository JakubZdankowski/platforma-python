import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import type { Json } from '../database/database.types';

type PublicationStatus = 'draft' | 'pending' | 'approved';
interface ExerciseDraft { id?: string; title: string; markdown: string; code: string; runtime: string; hidden: boolean }
const emptyExercise = (): ExerciseDraft => ({ title: 'Nowe ćwiczenie', markdown: '## Zadanie\n\nNapisz program, który wypisze Twoje imię.\n\n> Wskazówka: użyj `print()`.', code: 'print("Cześć!")', runtime: 'python-console', hidden: false });

/** Coordinates one mounted lesson draft; the database remains authoritative for permissions and saves. */
export function useMaterialEditor(lessonId: string) {
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
  useEffect(() => {
    if (lessonId === 'new') return;
    let active = true;
    setLoading(true); setError('');
    void (async () => {
      const [l,e] = await Promise.all([client.from('lessons').select('*').eq('id', lessonId).maybeSingle(), client.from('exercises').select('*').eq('lesson_id', lessonId).order('position')]);
      if (l.error || e.error || !l.data) throw new Error('unavailable');
      if (!active) return;
      setTitle(l.data.title); setStatus(l.data.publication_status); setOwner(l.data.teacher_id);
      setExercises(e.data.map(x => ({ id: x.id, title: x.title, markdown: x.instructions_markdown, code: x.starter_code, runtime: x.runtime_type, hidden: x.is_hidden })));
      setSelected(0);
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
  function moveExercise(direction: -1 | 1) {
    const target = selected + direction;
    if (!editable || busy || target < 0 || target >= exercises.length) return;
    const reordered = [...exercises];
    [reordered[selected], reordered[target]] = [reordered[target]!, reordered[selected]!];
    setExercises(reordered);
    setSelected(target);
    setDirty(true);
    setNotice(`Ćwiczenie „${reordered[target]!.title}” przeniesiono na pozycję ${target + 1} z ${exercises.length}. Kolejność zostanie zapisana razem z lekcją.`);
  }
  function toggleHidden() {
    if (!editable || busy || !exercises[selected]) return;
    const hidden = !exercises[selected]!.hidden;
    update({ hidden });
    setNotice(hidden ? 'Ćwiczenie będzie ukryte dla uczniów po zapisaniu lekcji. Treść i prace pozostaną zachowane.' : 'Ćwiczenie będzie widoczne dla uczniów po zapisaniu lekcji.');
  }
  function removeExercise() {
    const exercise = exercises[selected];
    if (!editable || !exercise || !window.confirm(`Usunąć ćwiczenie „${exercise.title}”? Po zapisaniu lekcji jego prace uczniów zostaną trwale usunięte.`)) return;
    setExercises(prev => prev.filter((_, i) => i !== selected));
    setSelected(Math.max(0, selected - 1)); setDirty(true); setNotice('Usunięcie ćwiczenia zostanie zastosowane po zapisaniu lekcji.');
  }
  async function removeLesson() {
    if (!id || !editable || busy || !window.confirm(`Trwale usunąć lekcję „${title}”, wszystkie jej ćwiczenia i prace uczniów? Tej operacji nie można cofnąć.`)) return;
    setBusy(true); setNotice('');
    try {
      const result = await client.from('lessons').delete().eq('id', id).select('id').single();
      if (result.error) throw result.error;
      setDirty(false); void navigate(`${base}/materials`);
    } catch { setNotice('Nie udało się usunąć lekcji.'); }
    finally { setBusy(false); }
  }
  async function save(nextStatus: PublicationStatus) {
    if (status === 'approved' && nextStatus === 'draft' && !window.confirm('Przywrócić lekcję do szkicu? Uczniowie stracą dostęp do ponownego zatwierdzenia.')) return;
    if (!title.trim() || exercises.some(x => !x.title.trim() || !x.markdown.trim())) { setNotice('Uzupełnij tytuł lekcji, tytuły ćwiczeń i instrukcje.'); return; }
    setBusy(true); setNotice('');
    try {
      const payload = exercises.map(x => ({ id: x.id ?? null, title: x.title.trim(), markdown: x.markdown, code: x.code, runtime: x.runtime, hidden: x.hidden })) as Json;
      const r = await client.rpc('save_material', { p_lesson_id: id, p_title: title.trim(), p_exercises: payload, p_status: nextStatus });
      if (r.error) throw r.error;
      setDirty(false); setId(r.data); setStatus(nextStatus); setNotice(nextStatus === 'pending' ? 'Wysłano do zatwierdzenia.' : nextStatus === 'approved' ? 'Lekcja zatwierdzona. Możesz dodać ją do modułu.' : 'Zapisano szkic.');
      if (lessonId !== r.data) void navigate(`${base}/materials/${r.data}`, { replace: true });
      else setAttempt(v => v + 1);
    } catch { setNotice('Nie udało się zapisać lekcji. Twoje zmiany pozostały w edytorze.'); }
    finally { setBusy(false); }
  }
  function changeTitle(value: string) { setTitle(value); setDirty(true); }
  function addExercise() {
    setExercises(prev => [...prev, emptyExercise()]);
    setSelected(exercises.length);
    setDirty(true);
  }
  function copyToDraft() {
    setId(null); setStatus('draft'); setOwner(profile.id);
    setExercises(prev => prev.map(x => ({ ...x, id: undefined })));
    setTitle(title + ' — kopia'); setDirty(true);
  }
  return {
    state: { id, title, exercises: exercises as readonly Readonly<ExerciseDraft>[], selected, status,
      admin, base, loading, busy, error, notice, dirty, editable } as const,
    actions: {
      changeTitle, updateExercise: update, selectExercise: (index: number) => setSelected(index), addExercise,
      moveExercise, toggleHidden, removeExercise, removeLesson, copyToDraft,
      saveDraft: () => save('draft'),
      submitForApproval: () => save('pending'),
      approve: () => save('approved'),
      retry: () => setAttempt(value => value + 1),
    },
  };
}
