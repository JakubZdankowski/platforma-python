import { Notice } from '../app/ui/Patterns';
import { Button } from '../app/ui/Button';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAuth, useProfile } from '../auth/AuthProvider';
import type { Locale, Messages } from '../i18n/en';
import { currentWork, workActivity, type StudentWork } from './liveWorkService';
import { useLiveClass } from './useLiveClass';

import { StudentCodePreview } from './StudentCodePreview';

function runLabel(work: StudentWork | undefined, t: Messages) {
  if (!work?.last_run_at) return t.noLastRun;
  return work.last_run_success ? `✓ ${t.lastRunSuccess}` : work.last_error_type ?? t.lastRunFailed;
}

export function TeacherLivePage({ messages, locale }: { messages: Messages; locale: Locale }) {
  const { classId = '' } = useParams();
  const [params] = useSearchParams();
  const studentId = params.get('student');
  return <ClassLive key={`${classId}-${studentId ?? ''}`} initialStudentId={studentId} classId={classId} messages={messages} locale={locale} />;
}

function ClassLive({ classId, initialStudentId, messages: t, locale }: { classId: string; initialStudentId: string | null; messages: Messages; locale: Locale }) {
  const { client } = useAuth();
  const base = useProfile().role === 'admin' ? '/admin' : '/teacher';
  const live = useLiveClass(client, classId);
  const [selectedId, setSelectedId] = useState<string | null>(initialStudentId);
  const [exerciseId, setExerciseId] = useState<string>('');
  const [lessonId, setLessonId] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const back = <p><Link to={`${base}/classes/${classId}`}>{t.backToClass}</Link></p>;
  if (live.state.status === 'loading') return <main className="account-page">{back}<Notice>{t.loadingData}</Notice></main>;
  if (live.state.status === 'not-found') return <main className="account-page">{back}<p role="alert" className="form-error">{t.classNotFound}</p></main>;
  if (live.state.status === 'error') return <main className="account-page">{back}<div className="form-error" role="alert">
    <p>{t.dataUnavailable}</p><Button type="button" variant="secondary" onClick={live.retry}>{t.retry}</Button></div></main>;
  const { details, students, exercises, work, availableExercises } = live.state.snapshot;
  const selected = students.find((student) => student.id === selectedId);
  const studentExercises = availableExercises.filter(e => e.student_id === selectedId);
  const lessons = [...new Map(studentExercises.map(e => [e.lesson_id, e.lesson_title])).entries()];
  const lessonExercises = studentExercises.filter(e => e.lesson_id === lessonId);
  const latestWork = selected ? currentWork(work, selected.id) : undefined;
  const selectedExercise = lessonId ? lessonExercises.find(e => e.id === exerciseId) : studentExercises.find(e => e.id === latestWork?.exercise_id);
  const selectedWork = selected ? (lessonId ? (selectedExercise ? work.find(w => w.student_id === selected.id && w.exercise_id === exerciseId) : undefined) : latestWork) : undefined;
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
    <section id="student-live-view" className="live-viewer" aria-labelledby="student-live-title">
      <h2 id="student-live-title" className="sr-only">{selected ? t.watchStudent(selected.displayName) : t.studentCodeLabel}</h2>
      <div className="live-exercise-pickers">
      <label className="live-exercise-picker"><span>Uczeń</span><select aria-label="Podgląd ucznia" value={selected?.id ?? ''} onChange={event => { setSelectedId(event.target.value || null); setLessonId(''); setExerciseId(''); }}>
        <option value="">{students.length ? 'Wybierz ucznia' : t.noClassStudents}</option>
        {students.map(student => {
          const current = currentWork(work, student.id);
          const currentExercise = exercises.find(exercise => exercise.id === current?.exercise_id);
          const activity = workActivity(current, now);
          const active = activity.kind === 'typing' || activity.kind === 'active';
          return <option key={student.id} value={student.id} data-testid={`live-student-${student.id}`}>{student.displayName} · {active ? t.activityActive : t.activityInactive}{currentExercise ? ` · ${currentExercise.title}` : ''}{current?.status === 'completed' ? ` · ${t.completed}` : ''}</option>;
        })}
      </select></label>
      <Button type="button" variant={selected && !lessonId ? 'primary' : 'secondary'} size="compact" className="live-mode-button" disabled={!selected} aria-pressed={Boolean(selected && !lessonId)} onClick={() => { setLessonId(''); setExerciseId(''); }}>Podgląd na żywo</Button>
      <label className="live-exercise-picker"><span>Lekcja</span><select aria-label="Lekcja ucznia" disabled={!selected} value={lessonId} onChange={event => { setLessonId(event.target.value); setExerciseId(''); }}>
        <option value="" disabled>Wybierz lekcję</option>
        {lessons.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
      </select></label>
      <label className="live-exercise-picker"><span>Ćwiczenie</span><select aria-label="Ćwiczenie ucznia" value={exerciseId} disabled={!lessonId || !lessonExercises.length} data-work-status={exerciseId ? selectedWork?.status ?? 'not_started' : undefined} onChange={event => setExerciseId(event.target.value)}>
        <option value="">{lessonId ? 'Wybierz ćwiczenie' : 'Najpierw wybierz lekcję'}</option>
        {lessonExercises.map(e => { const saved = work.find(w => w.student_id === selected?.id && w.exercise_id === e.id); return <option key={e.id} value={e.id} data-work-status={saved?.status ?? 'not_started'}>{e.title} ({saved?.status === 'completed' ? 'Ukończone' : saved && saved.status !== 'not_started' ? 'W trakcie' : 'Nierozpoczęte'})</option>; })}
      </select></label>
      </div>
      {selected ? <>
      {!studentExercises.length && <p className="account-muted live-exercise-notice">Uczeń nie ma obecnie dostępnych ćwiczeń.</p>}
      {exerciseId && !selectedExercise && <p className="account-muted live-exercise-notice">To ćwiczenie nie jest już dostępne uczniowi. Wybierz inne ćwiczenie.</p>}
      {selectedWork || selectedExercise ? <>
        <p className="live-exercise-title">{typeof exerciseTitle === 'string' ? exerciseTitle : exerciseTitle ? `${exerciseTitle.lessonTitle} — ${exerciseTitle.title}` : t.unavailableExercise}</p>

        {selectedWork ? <>
        <div className="live-work-details">
          <span>{selectedWork.status === 'completed' ? `✓ ${t.completed}` : t.inProgress}</span>
          <span>{t.lastEdited}: <time dateTime={selectedWork.last_edited_at}>{formatTime(selectedWork.last_edited_at)}</time></span>
          <span>{t.lastRun}: {runLabel(selectedWork, t)}{selectedWork.last_run_at && <> · <time dateTime={selectedWork.last_run_at}>{formatTime(selectedWork.last_run_at)}</time></>}</span>
        </div>
        {selectedWork.last_error_summary && <p className="form-error">{selectedWork.last_error_summary}</p>}
        </> : <p className="account-muted live-exercise-notice">Uczeń nie rozpoczął tego ćwiczenia. Poniżej kod początkowy.</p>}
        <StudentCodePreview key={`${selected.id}-${selectedWork?.exercise_id ?? selectedExercise?.id}`}
          exerciseTitle={selectedExercise?.title} instructionsMarkdown={selectedExercise?.instructions_markdown}
          code={selectedWork?.code ?? selectedExercise?.starter_code ?? ''}
          turtleEnabled={exercises.find(e => e.id === (selectedWork?.exercise_id ?? selectedExercise?.id))?.runtimeType === 'python-turtle'} messages={t} locale={locale} />
      </> : <p className="account-muted live-empty">{lessonId ? 'Wybierz ćwiczenie, aby zobaczyć pracę ucznia.' : t.studentHasNotStarted}</p>}
    </> : <p className="account-muted live-empty">{t.chooseLiveStudent}</p>}
    </section>
    </div>
  </main>;
}
