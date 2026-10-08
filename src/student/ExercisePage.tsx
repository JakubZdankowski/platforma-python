import { lazy, Suspense, useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Exercise } from '../exercises/types';
import type { ExecutionResult } from '../runtime/protocol';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';
import { OutputPanel } from '../output/OutputPanel';
import { usePythonRunner } from '../runtime/usePythonRunner';
import { TurtlePanel } from '../turtle/TurtlePanel';
import { PanelResizer } from './PanelResizer';
import { SampleExercisePicker } from './SampleExercisePicker';
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
}

export function ExercisePage({ messages: t, locale, exercise, exercises, exerciseIndex, code, onChange: setCode,
  onSelect, lessonTitle, saveStatus, beforeRun, onRunResult, onReset, backLink, warning, readOnly = false }: Props) {
  const turtleEnabled = exercise.runtimeType === 'python-turtle';
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);
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
        <SampleExercisePicker
          exercises={exercises}
          selectedIndex={exerciseIndex}
          disabled={runner.isBusy || preparing}
          labels={{ navigation: lessonTitle ? t.lessonExercises : t.sampleExercises, previous: t.previousExercise, next: t.nextExercise }}
          onSelect={selectExercise}
        />
      </header>
      {warning && <div className="work-warning" role="alert">{warning}</div>}
      <div
        className={`exercise-layout${instructionsCollapsed ? ' instructions-collapsed' : ''}${turtleEnabled ? ' has-turtle' : ''}`}
        style={outputWidth === null ? undefined : { '--output-width': `${outputWidth}px` } as CSSProperties}
      >
        <aside className="instructions-panel" aria-labelledby="instructions-title">
          <div className="panel-heading instructions-heading">
            {backLink ? <h1 id="instructions-title">{lessonTitle ?? t.lessonLabel}</h1> : <h2 id="instructions-title">{t.instructions}</h2>}
            <button
              type="button"
              className="instructions-toggle"
              aria-expanded={!instructionsCollapsed}
              aria-controls="instructions-content"
              aria-label={instructionsCollapsed ? t.expandInstructions : t.collapseInstructions}
              title={instructionsCollapsed ? t.expandInstructions : t.collapseInstructions}
              onClick={() => setInstructionsCollapsed((collapsed) => !collapsed)}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div id="instructions-content" className="instructions-content" hidden={instructionsCollapsed}>
            <span className="exercise-number">{t.exerciseLabel} {String(exerciseIndex + 1).padStart(2, '0')}{backLink && <> · {exercise.title}</>}</span>
            <MarkdownInstructions key={`markdown-${exercise.id}`} markdown={exercise.instructionsMarkdown} />
            <details key={`tip-${exercise.id}`} className="tip">
              <summary>{t.tipTitle}</summary>
              <p>{turtleEnabled ? t.turtleTip : t.tip}</p>
            </details>
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
              <button type="button" className="button button-secondary button-small" onClick={() => {
                const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
                const link = document.createElement('a');
                link.href = url;
                link.download = `${exercise.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || 'cwiczenie'}.py`;
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}>Pobierz kod .py</button>
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
