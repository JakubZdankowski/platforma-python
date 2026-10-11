import { lazy, Suspense, useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Exercise } from '../exercises/types';
import type { ExecutionResult } from '../runtime/protocol';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';
import { OutputPanel } from '../output/OutputPanel';
import { usePythonRunner } from '../runtime/usePythonRunner';
import { TurtlePanel } from '../turtle/TurtlePanel';
import { PanelResizer } from './PanelResizer';
import { SampleExercisePicker } from './SampleExercisePicker';
import { downloadCode } from './downloadCode';
import type { Messages, Locale } from '../i18n/en';

const CodeEditor = lazy(() => import('../editor/CodeEditor').then((module) => ({ default: module.CodeEditor })));

interface Props {
  messages: Messages;
  locale: Locale;
  exercise: Exercise;
  exercises: readonly Exercise[];
  exerciseIndex: number;
  code: string;
  onChange: (code: string) => void;
  onSelect: (index: number) => void | Promise<void>;
  lessonTitle?: string;
  saveStatus?: string;
  beforeRun?: () => Promise<boolean>;
  onRunResult?: (result: ExecutionResult) => void;
  onReset?: () => void;
  backLink?: ReactNode;
  warning?: string;
  readOnly?: boolean;
  completed?: boolean;
  onCompletedChange?: (completed: boolean) => void;
}

export function ExercisePage({ messages: t, locale, exercise, exercises, exerciseIndex, code, onChange: setCode,
  onSelect, lessonTitle, saveStatus, beforeRun, onRunResult, onReset, backLink, warning, readOnly = false, completed, onCompletedChange }: Props) {
  const turtleEnabled = exercise.runtimeType === 'python-turtle';
  const [activePanel, setActivePanel] = useState<'instructions' | 'contents' | null>('instructions');
  const instructionsCollapsed = activePanel === null;
  // Width of the output column chosen with the resizer; null means the default responsive width.
  const [outputWidth, setOutputWidth] = useState<number | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const runner = usePythonRunner();
  const [preparing, setPreparing] = useState(false);
  const preparingRef = useRef(false);
  const run = useCallback(() => {
    if (readOnly || preparingRef.current || runner.isBusy) return;
    preparingRef.current = true;
    setPreparing(true);
    void (async () => {
      try {
        if (beforeRun && !await beforeRun()) return;
        const result = await runner.run(code, t.inputUnavailable, turtleEnabled);
        if (result) onRunResult?.(result);
      } finally { preparingRef.current = false; setPreparing(false); }
    })();
  }, [readOnly, runner.run, runner.isBusy, code, t.inputUnavailable, turtleEnabled, beforeRun, onRunResult]);
  const selectExercise = useCallback((index: number) => {
    if (index < 0 || index >= exercises.length || index === exerciseIndex || preparingRef.current) return;
    void onSelect(index);
    runner.clear();
  }, [exerciseIndex, exercises.length, onSelect, runner.clear]);
  const output = <OutputPanel messages={t} locale={locale} status={runner.status} result={runner.result} stdout={runner.output.stdout} stderr={runner.output.stderr} truncated={runner.truncated} drawing={runner.drawing} />;
  const runtimeLabel = runner.drawing ? t.turtleDrawing : runner.status === 'error' ? t.pythonError : t[runner.status];

  return (
    <main className={`page${saveStatus ? ' saved-exercise' : ''}`}>
      <header className={`exercise-header${backLink ? ' exercise-header-compact' : ''}`}>
        <div>
          {!backLink && <p className="eyebrow">{lessonTitle ?? t.lessonLabel}</p>}
          {backLink ? <div className="exercise-back">{backLink}</div> : <>
            <h1>{exercise.title}</h1>
            <p className="exercise-description">{t.lessonDescription}</p>
          </>}
        </div>
        {onCompletedChange && <label className="completion-checkbox"><input type="checkbox" checked={completed ?? false} disabled={readOnly} onChange={(event) => onCompletedChange(event.target.checked)} />{t.markCompleted}</label>}
        <SampleExercisePicker
          exercises={exercises}
          selectedIndex={exerciseIndex}
          disabled={runner.isBusy || preparing}
          labels={{ navigation: lessonTitle ? t.lessonExercises : t.sampleExercises, previous: t.previousExercise, next: t.nextExercise, exercises: t.exercises }}
          onSelect={selectExercise}
        />
      </header>
      {warning && <div className="work-warning" role="alert">{warning}</div>}
      <div
        className={`exercise-layout lesson-workspace${instructionsCollapsed ? ' lesson-panel-collapsed' : ''}${turtleEnabled ? ' has-turtle' : ''}`}
        style={outputWidth === null ? undefined : { '--output-width': `${outputWidth}px` } as CSSProperties}
      >
        <nav className="lesson-tool-rail" aria-label={t.lessonPanels}>
          <button type="button" aria-label={t.instructions} title={t.instructions} aria-expanded={activePanel === 'instructions'} aria-controls="lesson-side-panel" onClick={() => setActivePanel((panel) => panel === 'instructions' ? null : 'instructions')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 5h1v3M3 11h2l-2 3h2M3 17h2v3H3" /></svg>
          </button>
          <button type="button" aria-label={t.lessonExercises} title={t.lessonExercises} aria-expanded={activePanel === 'contents'} aria-controls="lesson-side-panel" onClick={() => setActivePanel((panel) => panel === 'contents' ? null : 'contents')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></svg>
          </button>
        </nav>
        <aside id="lesson-side-panel" className="instructions-panel" aria-labelledby="instructions-title" hidden={instructionsCollapsed}>
          <div className="panel-heading"><h2 id="instructions-title">{activePanel === 'contents' ? t.lessonExercises : t.instructions}</h2></div>
          <div className="instructions-content">
            {activePanel === 'contents' ? <ol className="lesson-contents-list">{exercises.map((item, index) => <li key={item.id}><button type="button" aria-current={index === exerciseIndex ? 'step' : undefined} disabled={runner.isBusy || preparing} onClick={() => selectExercise(index)}>{item.title}</button></li>)}</ol> : <>
              <span className="exercise-number">{lessonTitle && <>{lessonTitle} · </>}{exercise.title}</span>
              <MarkdownInstructions key={`markdown-${exercise.id}`} markdown={exercise.instructionsMarkdown} />
              <details key={`tip-${exercise.id}`} className="tip"><summary>{t.tipTitle}</summary><p>{turtleEnabled ? t.turtleTip : t.tip}</p></details>
            </>}
          </div>
        </aside>
        <section ref={editorRef} className="editor-panel" aria-labelledby="editor-title">
          <div className="panel-heading">
            <h2 id="editor-title">{t.editorTitle}</h2>
            {saveStatus && <span className="save-status" role="status" aria-live="polite">{saveStatus}</span>}
            <span className="language-badge">Python</span>
          </div>
          <Suspense fallback={<div className="code-editor editor-loading" role="status">{t.loadingEditor}</div>}>
            <CodeEditor key={exercise.id} value={code} onChange={setCode} onRun={run} label={t.editorLabel} helpId="editor-help" readOnly={readOnly} />
          </Suspense>
          <p id="editor-help" className="sr-only">{t.editorHelp}</p>
          <div className="editor-toolbar">
            <div className="run-controls">
              <button type="button" className="button button-primary" onClick={run} disabled={readOnly || runner.isBusy || preparing} aria-keyshortcuts="Control+Enter Meta+Enter">
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 13 8l-9 5.5z" fill="currentColor" /></svg>
                {runner.status === 'error' ? t.retry : t.run}
              </button>
              {runner.isBusy
                ? <button type="button" className="button button-stop" onClick={runner.stop}><span className="stop-symbol" aria-hidden="true" />{t.stop}</button>
                : <span className="shortcut">{t.shortcut}</span>}
              {onReset && <button type="button" className="button button-secondary button-small" disabled={readOnly || runner.isBusy || preparing}
                onClick={() => { if (window.confirm(t.confirmResetCode)) { onReset(); runner.clear(); } }}>{t.resetCode}</button>}
              <button type="button" className="button button-secondary button-small" onClick={() => downloadCode(code, exercise.title)}>Pobierz kod .py</button>
            </div>
            <span className="runtime-status"><span className={`status-dot ${runner.isBusy ? 'is-busy' : ''}`} aria-hidden="true" />{runtimeLabel}</span>
          </div>
        </section>
        <div ref={outputRef} className="output-column">
          <PanelResizer label={t.resizePanels} editorRef={editorRef} outputRef={outputRef} onResize={setOutputWidth} />
          {turtleEnabled && (
            <TurtlePanel
              messages={t}
              drawing={runner.turtle}
              speed={runner.turtleSpeed}
              onSpeedChange={runner.setTurtleSpeed}
              canSkip={runner.isBusy}
              onSkip={runner.skipAnimation}
            />
          )}
          {output}
        </div>
      </div>
      <footer className="page-footer">{saveStatus ? t.savedNotice : t.localNotice}</footer>
    </main>
  );
}
