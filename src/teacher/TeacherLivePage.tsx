import { Notice } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import type { Locale, Messages } from '../i18n/en';
import { currentWork, workActivity, type StudentWork } from './liveWorkService';
import { useLiveClass } from './useLiveClass';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';

import { StudentCodePreview } from './StudentCodePreview';

function runLabel(work: StudentWork | undefined, t: Messages) {
  if (!work?.last_run_at) return t.noLastRun;
  return work.last_run_success ? `✓ ${t.lastRunSuccess}` : work.last_error_type ?? t.lastRunFailed;
}

export function TeacherLivePage({ messages, locale }: { messages: Messages; locale: Locale }) {
  const { classId = '' } = useParams();
  return <ClassLive key={classId} classId={classId} messages={messages} locale={locale} />;
}

function ClassLive({ classId, messages: t, locale }: { classId: string; messages: Messages; locale: Locale }) {
  const { client } = useAuth();
  const base = useProfile().role === 'admin' ? '/admin' : '/teacher';
  const live = useLiveClass(client, classId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string>('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const back = <p><Link to={`${base}/classes/${classId}`}>← {t.backToClass}</Link></p>;
  if (live.state.status === 'loading') return <main className="account-page">{back}<Notice>{t.loadingData}</Notice></main>;
  if (live.state.status === 'not-found') return <main className="account-page">{back}<p role="alert" className="form-error">{t.classNotFound}</p></main>;
  if (live.state.status === 'error') return <main className="account-page">{back}<div className="form-error" role="alert">
    <p>{t.dataUnavailable}</p><Button type="button" variant="secondary" onClick={live.retry}>{t.retry}</Button></div></main>;
  const { details, students, exercises, work, availableExercises } = live.state.snapshot;
  const selected = students.find((student) => student.id === selectedId);
  const studentExercises = availableExercises.filter(e => e.student_id === selectedId);
  const latestWork = selected ? currentWork(work, selected.id) : undefined;
  const selectedExercise = exerciseId ? studentExercises.find(e => e.id === exerciseId) : studentExercises.find(e => e.id === latestWork?.exercise_id);
  const selectedWork = selected ? (exerciseId ? (selectedExercise ? work.find(w => w.student_id === selected.id && w.exercise_id === exerciseId) : undefined) : latestWork) : undefined;
  const exerciseTitle = selectedExercise ? `${selectedExercise.lesson_title} — ${selectedExercise.title}` : exercises.find(e => e.id === selectedWork?.exercise_id);
  const status = live.connection === 'live' ? t.liveConnected : live.connection === 'connecting' ? t.liveConnecting : t.liveDisconnected;
  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
  return <main className="account-page live-class-page">
    <header className="live-page-header">
      <div className="live-page-title">{back}<h1>{t.liveClassTitle(details.name)}</h1></div>
      <div className="live-connection-line">
      <p className={`live-connection ${live.connection}`} role="status" data-testid="live-connection">{status}</p>
      {live.connection !== 'live' && <Button type="button" variant="secondary" size="compact" onClick={live.retry}>{t.retry}</Button>}
      </div>
    </header>
    {live.refreshFailed && <p role="alert" className="form-error">{t.liveRefreshFailed}</p>}
    <div className="live-workspace">
    <section className="live-students-panel" aria-labelledby="live-students-heading">
      <h2 id="live-students-heading">{t.studentsTitle(students.length)}</h2>
      {students.length ? <ul className="live-student-list">{students.map((student) => {
          const current = currentWork(work, student.id);
          const exercise = exercises.find((item) => item.id === current?.exercise_id);
          const activity = workActivity(current, now);
          const active = activity.kind === 'typing' || activity.kind === 'active';
          return <li key={student.id} data-testid={`live-student-${student.id}`}>
            <Button unstyled type="button" className={`student-watch-button${selectedId === student.id ? ' is-selected' : ''}`} onClick={() => { setSelectedId(student.id); setExerciseId(''); }}
              aria-label={t.watchStudent(student.displayName)} aria-pressed={selectedId === student.id} aria-controls="student-live-view">
              <span className="live-student-name">{student.displayName}</span>
              <span className="live-student-exercise" title={exercise ? `${exercise.lessonTitle} — ${exercise.title}` : undefined}>{current ? exercise?.title ?? t.unavailableExercise : '—'}</span>
              <span className="live-student-status"><span className={`activity-label ${active ? 'active' : 'inactive'}`}>{active ? t.activityActive : t.activityInactive}</span>
                {current?.status === 'completed' && <span className="live-student-completed run-success">{t.completed}</span>}</span>
            </Button>
          </li>;
        })}</ul> : <p className="account-muted live-empty">{t.noClassStudents}</p>}
    </section>
    <section id="student-live-view" className="live-viewer" aria-labelledby="student-live-title">
    {selected ? <>
      <div className="live-viewer-heading"><h2 id="student-live-title">{t.watchStudent(selected.displayName)}</h2>
        <span className="live-readonly">{t.readOnlyCode}</span>
        <Button type="button" variant="secondary" size="compact" onClick={() => setSelectedId(null)}>{t.closeLiveView}</Button></div>
      <label className="live-exercise-picker"><span>Ćwiczenie ucznia</span><select value={exerciseId} data-work-status={exerciseId ? selectedWork?.status ?? 'not_started' : undefined} onChange={event => setExerciseId(event.target.value)}>
        <option value="">Podgląd na żywo</option>
        {studentExercises.map(e => { const saved = work.find(w => w.student_id === selected.id && w.exercise_id === e.id); return <option key={e.id} value={e.id} data-work-status={saved?.status ?? 'not_started'}>{e.lesson_title} — {e.title} ({saved?.status === 'completed' ? 'Ukończone' : saved && saved.status !== 'not_started' ? 'W trakcie' : 'Nierozpoczęte'})</option>; })}
      </select></label>
      {!studentExercises.length && <p className="account-muted live-exercise-notice">Uczeń nie ma obecnie dostępnych ćwiczeń.</p>}
      {exerciseId && !selectedExercise && <p className="account-muted live-exercise-notice">To ćwiczenie nie jest już dostępne uczniowi. Wybierz inne ćwiczenie.</p>}
      {selectedWork || selectedExercise ? <>
        <p className="live-exercise-title">{typeof exerciseTitle === 'string' ? exerciseTitle : exerciseTitle ? `${exerciseTitle.lessonTitle} — ${exerciseTitle.title}` : t.unavailableExercise}</p>
        {selectedExercise && <details className="live-exercise-instructions"><summary>Treść ćwiczenia</summary><MarkdownInstructions markdown={selectedExercise.instructions_markdown} /></details>}
        {selectedWork ? <>
        <div className="live-work-details">
          <span>{selectedWork.status === 'completed' ? `✓ ${t.completed}` : t.inProgress}</span>
          <span>{t.lastEdited}: <time dateTime={selectedWork.last_edited_at}>{formatTime(selectedWork.last_edited_at)}</time></span>
          <span>{t.lastRun}: {runLabel(selectedWork, t)}{selectedWork.last_run_at && <> · <time dateTime={selectedWork.last_run_at}>{formatTime(selectedWork.last_run_at)}</time></>}</span>
        </div>
        {selectedWork.last_error_summary && <p className="form-error">{selectedWork.last_error_summary}</p>}
        </> : <p className="account-muted live-exercise-notice">Uczeń nie rozpoczął tego ćwiczenia. Poniżej kod początkowy.</p>}
        <StudentCodePreview key={`${selected.id}-${selectedWork?.exercise_id ?? selectedExercise?.id}`}
          code={selectedWork?.code ?? selectedExercise?.starter_code ?? ''}
          turtleEnabled={exercises.find(e => e.id === (selectedWork?.exercise_id ?? selectedExercise?.id))?.runtimeType === 'python-turtle'} messages={t} locale={locale} />
      </> : <p className="account-muted live-empty">{t.studentHasNotStarted}</p>}
    </> : <><h2 id="student-live-title" className="live-viewer-heading">{t.studentCodeLabel}</h2><p className="account-muted live-empty">{t.chooseLiveStudent}</p></>}
    </section>
    </div>
  </main>;
}
