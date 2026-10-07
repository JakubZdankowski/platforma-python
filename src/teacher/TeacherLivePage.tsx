import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import type { Locale, Messages } from '../i18n/en';
import { currentWork, latestRun, workActivity, type Activity, type StudentWork } from './liveWorkService';
import { useLiveClass } from './useLiveClass';

const CodeEditor = lazy(() => import('../editor/CodeEditor').then((module) => ({ default: module.CodeEditor })));

function activityLabel(activity: Activity, t: Messages) {
  return activity.kind === 'idle' ? t.activityIdle(activity.minutes)
    : activity.kind === 'typing' ? t.activityTyping : activity.kind === 'active' ? t.activityActive : t.activityNotStarted;
}

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
  const live = useLiveClass(client, classId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const back = <p><Link to={`/teacher/classes/${classId}`}>← {t.backToClass}</Link></p>;
  if (live.state.status === 'loading') return <main className="account-page">{back}<p role="status">{t.loadingData}</p></main>;
  if (live.state.status === 'not-found') return <main className="account-page">{back}<p role="alert" className="form-error">{t.classNotFound}</p></main>;
  if (live.state.status === 'error') return <main className="account-page">{back}<div className="form-error" role="alert">
    <p>{t.dataUnavailable}</p><button type="button" className="button button-secondary" onClick={live.retry}>{t.retry}</button></div></main>;
  const { details, students, exercises, work } = live.state.snapshot;
  const selected = students.find((student) => student.id === selectedId);
  const selectedWork = selected ? currentWork(work, selected.id) : undefined;
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedWork?.exercise_id);
  const status = live.connection === 'live' ? t.liveConnected : live.connection === 'connecting' ? t.liveConnecting : t.liveDisconnected;
  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
  return <main className="account-page live-class-page">
    {back}
    <h1>{t.liveClassTitle(details.name)}</h1>
    <div className="live-connection-line">
      <p className={`live-connection ${live.connection}`} role="status" data-testid="live-connection">{status}</p>
      {live.connection !== 'live' && <button type="button" className="button button-secondary button-small" onClick={live.retry}>{t.retry}</button>}
    </div>
    {live.refreshFailed && <p role="alert" className="form-error">{t.liveRefreshFailed}</p>}
    <p className="account-muted">{t.liveActivityHint}</p>
    <section className="account-section" aria-labelledby="live-students-heading">
      <h2 id="live-students-heading">{t.studentsTitle(students.length)}</h2>
      {students.length ? <div className="live-table-scroll"><table className="data-table live-table">
        <thead><tr><th scope="col">{t.existingStudent}</th><th scope="col">{t.currentExercise}</th><th scope="col">{t.activity}</th><th scope="col">{t.lastRun}</th></tr></thead>
        <tbody>{students.map((student) => {
          const current = currentWork(work, student.id);
          const exercise = exercises.find((item) => item.id === current?.exercise_id);
          const run = latestRun(work, student.id);
          const activity = workActivity(current, now);
          return <tr key={student.id} data-testid={`live-student-${student.id}`} className={selectedId === student.id ? 'is-selected' : undefined}>
            <td><button type="button" className="student-watch-button" onClick={() => setSelectedId(student.id)}
              aria-label={t.watchStudent(student.displayName)} aria-pressed={selectedId === student.id} aria-controls="student-live-view">
              {student.displayName}</button><span className="live-username">{student.username}</span></td>
            <td>{current ? <><span>{exercise?.title ?? t.unavailableExercise}</span>{exercise && <span className="live-lesson-title">{exercise.lessonTitle}</span>}</> : '—'}</td>
            <td><span className={`activity-label ${activity.kind}`}>{activityLabel(activity, t)}</span></td>
            <td><span className={run?.last_run_success ? 'run-success' : undefined} title={run?.last_run_at ? formatTime(run.last_run_at) : undefined}>{runLabel(run, t)}</span></td>
          </tr>;
        })}</tbody>
      </table></div> : <p className="account-muted">{t.noClassStudents}</p>}
    </section>
    {selected && <section id="student-live-view" className="account-section live-viewer" aria-labelledby="student-live-title">
      <div className="live-viewer-heading"><h2 id="student-live-title">{t.watchStudent(selected.displayName)}</h2>
        <button type="button" className="button button-secondary button-small" onClick={() => setSelectedId(null)}>{t.closeLiveView}</button></div>
      <p className="account-muted">{t.readOnlyCode}</p>
      {selectedWork ? <>
        <p className="live-exercise-title">{selectedExercise ? `${selectedExercise.lessonTitle} — ${selectedExercise.title}` : t.unavailableExercise}</p>
        <div className="live-work-details">
          <span>{t.lastEdited}: <time dateTime={selectedWork.last_edited_at}>{formatTime(selectedWork.last_edited_at)}</time></span>
          <span>{t.lastRun}: {runLabel(selectedWork, t)}{selectedWork.last_run_at && <> · <time dateTime={selectedWork.last_run_at}>{formatTime(selectedWork.last_run_at)}</time></>}</span>
        </div>
        {selectedWork.last_error_summary && <p className="form-error">{selectedWork.last_error_summary}</p>}
        <div className="live-code-container"><Suspense fallback={<p role="status">{t.loadingEditor}</p>}>
          <CodeEditor key={`${selected.id}-${selectedWork.exercise_id}`} value={selectedWork.code} readOnly label={t.studentCodeLabel} helpId="live-editor-help" />
        </Suspense></div>
        <p id="live-editor-help" className="sr-only">{t.readOnlyHelp}</p>
      </> : <p className="account-muted">{t.studentHasNotStarted}</p>}
    </section>}
  </main>;
}
