import { MaterialModule, EmptyState, PageHeading, Notice } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import type { Messages } from '../i18n/en';
import type { Lesson } from '../lessons/lessonService';
import { listModules, listModuleLessons, type ModuleSummary } from '../modules/moduleService';

export function StudentHomePage({ messages: t, materials = false }: { messages: Messages; materials?: boolean }) {
  const { client } = useAuth();
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const [modules, setModules] = useState<ModuleSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false); setModules(null);
    void listModules(client).then((result) => { if (active) setModules(result); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [client, attempt]);
  const selected = params.get('module');
  return <main className="account-page student-materials">
    <PageHeading title={materials ? 'Materiały' : t.studentGreeting(profile.displayName)} description={materials ? 'Rozwiń moduł, aby zobaczyć dostępne lekcje.' : 'Wybierz moduł i wróć do programowania.'} />
    {!materials && <h2>Materiały</h2>}
    {error && <Notice tone="error">{t.dataUnavailable}<Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>{t.retry}</Button></Notice>}
    {!modules && !error && <Notice>{t.loadingData}</Notice>}
    {modules && (modules.length ? <div className="materials-list">{modules.map((module) => {
      const expanded = selected === module.id;
      return <MaterialModule key={module.id} id={module.id} title={module.title} expanded={expanded} onToggle={() => setParams(expanded ? {} : { module: module.id })}>
        <ModuleLessons moduleId={module.id} messages={t} />
      </MaterialModule>;
    })}</div> : <EmptyState title="Nie masz jeszcze materiałów">Gdy nauczyciel udostępni Ci moduł, pojawi się tutaj.</EmptyState>)}
  </main>;
}

function ModuleLessons({ moduleId, messages: t }: { moduleId: string; messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const [data, setData] = useState<{ lessons: Lesson[]; started: Set<string>; completed: Set<string> } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError(false);
    void (async () => {
      const lessons = await listModuleLessons(client, moduleId);
      const ids = lessons.flatMap((lesson) => lesson.exercises.map((e) => e.id));
      const work = ids.length ? await client.from('student_work').select('exercise_id, status').eq('student_id', profile.id).in('exercise_id', ids) : { data: [], error: null };
      if (work.error) throw work.error;
      if (active) setData({ lessons, started: new Set(work.data.filter((w) => w.status !== 'not_started').map((w) => w.exercise_id)), completed: new Set(work.data.filter((w) => w.status === 'completed').map((w) => w.exercise_id)) });
    })().catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [client, moduleId, profile.id, attempt]);
  return <div className="material-lessons">
    {error ? <Notice tone="error">{t.dataUnavailable}<Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>{t.retry}</Button></Notice>
      : !data ? <Notice>{t.loadingData}</Notice>
      : !data.lessons.length ? <EmptyState title="W tym module nie ma jeszcze dostępnych lekcji." />
      : <ol className="module-lesson-list">{data.lessons.map((lesson, index) => <li key={lesson.id}>
        {lesson.exercises.length ? <Link className="module-lesson-link" to={`/student/exercises/${lesson.exercises[0]!.id}`} state={{ moduleId }}>
          <span className="module-lesson-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="module-lesson-title">{lesson.title}<small>{lesson.exercises.every((exercise) => data.completed.has(exercise.id)) ? t.completed : lesson.exercises.some((exercise) => data.started.has(exercise.id)) ? 'W trakcie' : 'Jeszcze nierozpoczęte'}</small></span>

        </Link> : <><h3>{lesson.title}</h3><p className="account-muted">{t.noClassExercises}</p></>}
      </li>)}</ol>}
  </div>;
}

export function StudentHelpPage() {
  return <main className="account-page"><h1>Pomoc</h1><p className="account-lead">Najważniejsze wskazówki do pracy z platformą.</p>
    <section className="help-section"><h2>Jak otworzyć zadanie?</h2><p>Przejdź do Materiałów, rozwiń moduł i wybierz lekcję. W edytorze kliknij nazwę lekcji w lewym panelu, aby przejść do dowolnego zadania z lekcji.</p></section>
    <section className="help-section"><h2>Gdzie jest mój kod?</h2><p>Kod zapisuje się automatycznie na Twoim koncie. Stan zapisu zobaczysz nad edytorem. Możesz też pobrać plik .py.</p></section>
    <section className="help-section"><h2>Jak uruchomić program?</h2><p>Naciśnij „Uruchom” lub Ctrl + Enter. Jeśli program działa zbyt długo, użyj przycisku „Zatrzymaj”.</p></section>
    <section className="help-section"><h2>Nie widzę materiałów</h2><p>Poproś nauczyciela o udostępnienie modułu. Do logowania potrzebujesz tylko nazwy użytkownika i hasła.</p></section>
    <section className="help-section"><h2>Co zrobić, gdy zapis nie działa?</h2><p>Zachowaj otwartą kartę i sprawdź połączenie z internetem. Przed wyjściem pobierz kod, aby nie stracić ostatnich zmian.</p></section>
  </main>;
}
