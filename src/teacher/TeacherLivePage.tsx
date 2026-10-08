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
    <header className="live-page-header">
      <div className="live-page-title">{back}<h1>{t.liveClassTitle(details.name)}</h1></div>
      <div className="live-connection-line">
      <p className={`live-connection ${live.connection}`} role="status" data-testid="live-connection">{status}</p>
      {live.connection !== 'live' && <button type="button" className="button button-secondary button-small" onClick={live.retry}>{t.retry}</button>}
      </div>
    </header>
    {live.refreshFailed && <p role="alert" className="form-error">{t.liveRefreshFailed}</p>}
    <details className="live-help"><summary>{t.liveHelpTitle}</summary><p>{t.liveActivityHint}</p></details>
    <div className="live-workspace">
    <section className="live-students-panel" aria-labelledby="live-students-heading">
      <h2 id="live-students-heading">{t.studentsTitle(students.length)}</h2>
      {students.length ? <ul className="live-student-list">{students.map((student) => {
          const current = currentWork(work, student.id);
          const exercise = exercises.find((item) => item.id === current?.exercise_id);
          const run = latestRun(work, student.id);
          const activity = workActivity(current, now);
          return <li key={student.id} data-testid={`live-student-${student.id}`}>
            <button type="button" className={`student-watch-button${selectedId === student.id ? ' is-selected' : ''}`} onClick={() => setSelectedId(student.id)}
              aria-label={t.watchStudent(student.displayName)} aria-pressed={selectedId === student.id} aria-controls="student-live-view">
              <span className="live-student-name">{student.displayName}<span className="live-username">{student.username}</span></span>
              <span className="live-student-exercise" title={exercise ? `${exercise.lessonTitle} — ${exercise.title}` : undefined}>{current ? exercise?.title ?? t.unavailableExercise : '—'}</span>
              <span className="live-student-status"><span className={`activity-label ${activity.kind}`}>{activityLabel(activity, t)}</span>
                <span className={run?.last_run_success ? 'run-success' : undefined} title={`${t.lastRun}: ${runLabel(run, t)}${run?.last_run_at ? ` · ${formatTime(run.last_run_at)}` : ''}`}>{runLabel(run, t)}</span></span>
            </button>
          </li>;
        })}</ul> : <p className="account-muted live-empty">{t.noClassStudents}</p>}
    </section>
    <section id="student-live-view" className="live-viewer" aria-labelledby="student-live-title">
    {selected ? <>
      <div className="live-viewer-heading"><h2 id="student-live-title">{t.watchStudent(selected.displayName)}</h2>
        <span className="live-readonly">{t.readOnlyCode}</span>
        <button type="button" className="button button-secondary button-small" onClick={() => setSelectedId(null)}>{t.closeLiveView}</button></div>
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
      </> : <p className="account-muted live-empty">{t.studentHasNotStarted}</p>}
    </> : <><h2 id="student-live-title" className="live-viewer-heading">{t.studentCodeLabel}</h2><p className="account-muted live-empty">{t.chooseLiveStudent}</p></>}
    </section>
    </div>
  </main>;
}
