import { Button } from '../app/ui/Button';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import type { Messages, Locale } from '../i18n/en';
import { listLessons, type Lesson } from '../lessons/lessonService';
import { listModuleLessons } from '../modules/moduleService';
import { ExercisePage } from './ExercisePage';
import { prepareStudentWork, useStudentWork, type PreparedWork } from './useStudentWork';
import type { Exercise } from '../exercises/types';

export function StudentExercisePage({ messages: t, locale }: { messages: Messages; locale: Locale }) {
  const { client, editorLease } = useAuth();
  const { exerciseId = '' } = useParams();
  const location = useLocation();
  const moduleId = typeof location.state?.moduleId === 'string' ? location.state.moduleId as string : undefined;
  const home = moduleId ? `/student/materials?module=${encodeURIComponent(moduleId)}` : '/student/materials';
  const [content, setContent] = useState<{ lessons: Lesson[] } | 'error' | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setContent(null);
    void (moduleId ? listModuleLessons(client, moduleId) : listLessons(client)).then((lessons) => { if (active) setContent({ lessons }); }).catch(() => { if (active) setContent('error'); });
    return () => { active = false; };
  }, [client, moduleId, attempt]);
  const back = <p><Link to={home}>{t.allLessons}</Link></p>;
  if (editorLease !== 'owned') return <main className="account-page">{back}
    {editorLease === 'checking' ? <p role="status">{t.loadingData}</p>
      : <p role="alert">{editorLease === 'unsupported'
        ? 'Nie można zabezpieczyć edycji w tej przeglądarce. Otwórz aplikację w aktualnej wersji Chrome, Edge, Firefox lub Safari.'
        : 'To konto jest już otwarte w innej karcie tej przeglądarki. Zamknij tamtą kartę, aby edytować kod tutaj.'}</p>}
  </main>;
  if (!content) return <main className="account-page">{back}<p role="status">{t.loadingData}</p></main>;
  if (content === 'error') return <main className="account-page">{back}<p role="alert">{t.dataUnavailable}</p>
    <Button type="button" variant="secondary" onClick={() => setAttempt((a) => a + 1)}>{t.retry}</Button></main>;
  const lesson = content.lessons.find((l) => l.exercises.some((e) => e.id === exerciseId));
  const index = lesson?.exercises.findIndex((e) => e.id === exerciseId) ?? -1;
  const exercise = lesson?.exercises[index];
  if (!lesson || !exercise) return <main className="account-page">{back}<p role="alert">{t.exerciseNotFound}</p></main>;
  return <SavedExercise key={lesson.id} lesson={lesson} exercise={exercise} index={index} messages={t} locale={locale} />;
}

function SavedExercise({ lesson, exercise, index, messages: t, locale }: { lesson: Lesson; exercise: Exercise; index: number; messages: Messages; locale: Locale }) {
  const { client } = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const moduleId = typeof location.state?.moduleId === 'string' ? location.state.moduleId as string : undefined;
  const home = moduleId ? `/student/materials?module=${encodeURIComponent(moduleId)}` : '/student/materials';
  const [prepared, setPrepared] = useState<PreparedWork>();
  const [switchError, setSwitchError] = useState(false);
  const [switching, setSwitching] = useState(false);
  const work = useStudentWork(client, profile.id, exercise, prepared);
  const backLink = <Link to={home} onClick={(event) => { event.preventDefault(); void work.flush().then((ok) => { if (ok || work.state.status !== 'ready') void navigate(home); }); }}>{t.allLessons}</Link>;
  const back = <p>{backLink}</p>;
  if (work.state.status !== 'ready') return <main className="account-page">{back}
    {work.state.status === 'loading' ? <p role="status">{t.loadingData}</p> : <div role="alert"><p>{t.dataUnavailable}</p>
      <Button type="button" variant="secondary" onClick={work.retry}>{t.retry}</Button></div>}
  </main>;
  return <ExercisePage messages={t} locale={locale} exercise={exercise} exercises={lesson.exercises} backLink={backLink}
    switching={switching}
    exerciseIndex={index} lessonTitle={lesson.title} code={work.state.code} onChange={work.change}
    completed={work.state.completed} onCompletedChange={work.setCompleted}
    readOnly={work.accessLost}
    warning={switchError ? t.dataUnavailable : work.accessLost
      ? 'To ćwiczenie jest obecnie niedostępne. Twój kod pozostał na ekranie. Skopiuj go lub pobierz plik .py przed opuszczeniem strony. Zapis jest niedostępny.'
      : work.offline
        ? work.state.save === 'saved' ? 'Brak połączenia — dalsze zmiany nie będą zapisywane do czasu odzyskania połączenia.' : 'Brak połączenia — zmiany nie zostały zapisane. Zachowaj otwartą kartę lub pobierz kod .py.'
        : work.state.save === 'error' ? 'Zmiany nie zostały zapisane — ponawiam zapis. Zachowaj otwartą kartę lub pobierz kod .py.' : undefined}
    saveStatus={work.state.save === 'saved' ? t.savedCode : work.state.save === 'error' ? t.retryingSave : t.savingCode}
    beforeRun={work.flush} onRunResult={work.recordRun} onReset={() => { work.change(exercise.starterCode); void work.flush(); }}
    onSelect={async (next) => {
      if (switching) return;
      setSwitching(true);
      setSwitchError(false);
      try {
        if (!await work.flush()) return;
        const target = lesson.exercises[next]!;
        const loaded = await prepareStudentWork(client, profile.id, target);
        // Edits made while the next exercise loads must also be saved before leaving.
        if (!await work.flush()) return;
        setPrepared(loaded);
        void navigate(`/student/exercises/${target.id}`, { state: { moduleId } });
      } catch { setSwitchError(true); }
      finally { setSwitching(false); }
    }} />;
}
