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
    <header className="materials-heading"><h1>{materials ? 'Materiały' : t.studentGreeting(profile.displayName)}</h1>
      <p className="account-lead">{materials ? 'Rozwiń moduł, aby zobaczyć dostępne lekcje.' : 'Wybierz moduł i wróć do programowania.'}</p>
    </header>
    {!materials && <h2>Materiały</h2>}
    {error && <div className="form-error" role="alert"><p>{t.dataUnavailable}</p><button className="button button-secondary" onClick={() => setAttempt((n) => n + 1)}>{t.retry}</button></div>}
    {!modules && !error && <p className="student-empty" role="status">{t.loadingData}</p>}
    {modules && (modules.length ? <div className="materials-list">{modules.map((module) => {
      const expanded = selected === module.id;
      return <section className="material-module" key={module.id}>
        <h2><button type="button" className="material-toggle" id={`module-${module.id}`} aria-expanded={expanded} aria-controls={`lessons-${module.id}`} onClick={() => setParams(expanded ? {} : { module: module.id })}>
          <span>{module.title}</span><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m9 5 7 7-7 7" /></svg>
        </button></h2>
        <div id={`lessons-${module.id}`} role="region" aria-labelledby={`module-${module.id}`} hidden={!expanded}>
          {expanded && <ModuleLessons moduleId={module.id} messages={t} />}
        </div>
      </section>;
    })}</div> : <div className="student-empty"><h2>Nie masz jeszcze materiałów</h2><p>Gdy nauczyciel udostępni Ci moduł, pojawi się tutaj.</p></div>)}
  </main>;
}

function ModuleLessons({ moduleId, messages: t }: { moduleId: string; messages: Messages }) {
  const { client } = useAuth();
  const profile = useProfile();
  const [data, setData] = useState<{ lessons: Lesson[]; started: Set<string> } | null>(null);
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
      if (active) setData({ lessons, started: new Set(work.data.filter((w) => w.status === 'in_progress').map((w) => w.exercise_id)) });
    })().catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [client, moduleId, profile.id, attempt]);
  return <div className="material-lessons">
    {error ? <div className="form-error" role="alert"><p>{t.dataUnavailable}</p><button className="button button-secondary" onClick={() => setAttempt((n) => n + 1)}>{t.retry}</button></div>
      : !data ? <p role="status">{t.loadingData}</p>
      : !data.lessons.length ? <p className="account-muted">W tym module nie ma jeszcze dostępnych lekcji.</p>
      : <ol className="module-lesson-list">{data.lessons.map((lesson, index) => <li key={lesson.id}>
        <h3><span className="module-lesson-index">{String(index + 1).padStart(2, '0')}</span>{lesson.title}</h3>
        {lesson.exercises.length ? <ul className="module-exercises">{lesson.exercises.map((exercise) => <li key={exercise.id}>
          <Link to={`/student/exercises/${exercise.id}`} state={{ moduleId }}><span>{exercise.title}<small>{data.started.has(exercise.id) ? 'W trakcie' : 'Jeszcze nierozpoczęte'}</small></span><span aria-hidden="true">→</span></Link>
        </li>)}</ul> : <p className="account-muted">{t.noClassExercises}</p>}
      </li>)}</ol>}
  </div>;
}

export function StudentHelpPage() {
  return <main className="account-page"><h1>Pomoc</h1><p className="account-lead">Najważniejsze wskazówki do pracy z platformą.</p>
    <section className="help-section"><h2>Jak otworzyć zadanie?</h2><p>Przejdź do Materiałów, rozwiń moduł i wybierz ćwiczenie w lekcji.</p></section>
    <section className="help-section"><h2>Gdzie jest mój kod?</h2><p>Kod zapisuje się automatycznie na Twoim koncie. Stan zapisu zobaczysz nad edytorem. Możesz też pobrać plik .py.</p></section>
    <section className="help-section"><h2>Jak uruchomić program?</h2><p>Naciśnij „Uruchom” lub Ctrl + Enter. Jeśli program działa zbyt długo, użyj przycisku „Zatrzymaj”.</p></section>
    <section className="help-section"><h2>Nie widzę materiałów</h2><p>Poproś nauczyciela o udostępnienie modułu. Do logowania potrzebujesz tylko nazwy użytkownika i hasła.</p></section>
    <section className="help-section"><h2>Co zrobić, gdy zapis nie działa?</h2><p>Zachowaj otwartą kartę i sprawdź połączenie z internetem. Przed wyjściem pobierz kod, aby nie stracić ostatnich zmian.</p></section>
  </main>;
}
