import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import type { Messages, Locale } from '../i18n/en';
import { listLessons, type Lesson } from '../lessons/lessonService';
import { ExercisePage } from './ExercisePage';
import { useStudentWork } from './useStudentWork';
import type { Exercise } from '../exercises/types';

export function StudentExercisePage({ messages: t, locale }: { messages: Messages; locale: Locale }) {
  const { client, editorLease } = useAuth();
  const { exerciseId = '' } = useParams();
  const [content, setContent] = useState<{ lessons: Lesson[] } | 'error' | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setContent(null);
    void listLessons(client).then((lessons) => { if (active) setContent({ lessons }); }).catch(() => { if (active) setContent('error'); });
    return () => { active = false; };
  }, [client, exerciseId, attempt]);
  const back = <p><Link to="/student">← {t.allLessons}</Link></p>;
  if (editorLease !== 'owned') return <main className="account-page">{back}
    {editorLease === 'checking' ? <p role="status">{t.loadingData}</p>
      : <p role="alert">{editorLease === 'unsupported'
        ? 'Nie można zabezpieczyć edycji w tej przeglądarce. Otwórz aplikację w aktualnej wersji Chrome, Edge, Firefox lub Safari.'
        : 'To konto jest już otwarte w innej karcie tej przeglądarki. Zamknij tamtą kartę, aby edytować kod tutaj.'}</p>}
  </main>;
  if (!content) return <main className="account-page">{back}<p role="status">{t.loadingData}</p></main>;
  if (content === 'error') return <main className="account-page">{back}<p role="alert">{t.dataUnavailable}</p>
    <button type="button" className="button button-secondary" onClick={() => setAttempt((a) => a + 1)}>{t.retry}</button></main>;
  const lesson = content.lessons.find((l) => l.exercises.some((e) => e.id === exerciseId));
  const index = lesson?.exercises.findIndex((e) => e.id === exerciseId) ?? -1;
  const exercise = lesson?.exercises[index];
  if (!lesson || !exercise) return <main className="account-page">{back}<p role="alert">{t.exerciseNotFound}</p></main>;
  return <SavedExercise key={exercise.id} lesson={lesson} exercise={exercise} index={index} messages={t} locale={locale} />;
}

function SavedExercise({ lesson, exercise, index, messages: t, locale }: { lesson: Lesson; exercise: Exercise; index: number; messages: Messages; locale: Locale }) {
  const { client } = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();
  const work = useStudentWork(client, profile.id, exercise);
  const backLink = <Link to="/student" onClick={(event) => { event.preventDefault(); void work.flush().then((ok) => { if (ok || work.state.status !== 'ready') void navigate('/student'); }); }}>← {t.allLessons}</Link>;
  const back = <p>{backLink}</p>;
  if (work.state.status !== 'ready') return <main className="account-page">{back}
    {work.state.status === 'loading' ? <p role="status">{t.loadingData}</p> : <div role="alert"><p>{t.dataUnavailable}</p>
      <button type="button" className="button button-secondary" onClick={work.retry}>{t.retry}</button></div>}
  </main>;
  return <ExercisePage messages={t} locale={locale} exercise={exercise} exercises={lesson.exercises} backLink={backLink}
    exerciseIndex={index} lessonTitle={lesson.title} code={work.state.code} onChange={work.change}
    readOnly={work.accessLost}
    warning={work.accessLost
      ? 'Dostęp do tej lekcji został odebrany. Twój kod pozostał na ekranie. Skopiuj go lub pobierz plik .py przed opuszczeniem strony. Zapis jest niedostępny.'
      : work.offline
        ? work.state.save === 'saved' ? 'Brak połączenia — dalsze zmiany nie będą zapisywane do czasu odzyskania połączenia.' : 'Brak połączenia — zmiany nie zostały zapisane. Zachowaj otwartą kartę lub pobierz kod .py.'
        : work.state.save === 'error' ? 'Zmiany nie zostały zapisane — ponawiam zapis. Zachowaj otwartą kartę lub pobierz kod .py.' : undefined}
    saveStatus={work.state.save === 'saved' ? t.savedCode : work.state.save === 'error' ? t.retryingSave : t.savingCode}
    beforeRun={work.flush} onRunResult={work.recordRun} onReset={() => { work.change(exercise.starterCode); void work.flush(); }}
    onSelect={async (next) => { if (await work.flush()) void navigate(`/student/exercises/${lesson.exercises[next]!.id}`); }} />;
}
