import { lazy, Suspense, useCallback, useRef, useState, type CSSProperties } from 'react';
import { sampleExercises } from '../exercises/sampleExercise';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';
import { OutputPanel } from '../output/OutputPanel';
import { usePythonRunner } from '../runtime/usePythonRunner';
import { TurtlePanel } from '../turtle/TurtlePanel';
import { PanelResizer } from './PanelResizer';
import { SampleExercisePicker } from './SampleExercisePicker';
import type { Messages, Locale } from '../i18n/en';

const CodeEditor = lazy(() => import('../editor/CodeEditor').then((module) => ({ default: module.CodeEditor })));

export function ExercisePage({ messages: t, locale }: { messages: Messages; locale: Locale }) {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const exercise = sampleExercises[exerciseIndex] ?? sampleExercises[0]!;
  const turtleEnabled = exercise.runtimeType === 'python-turtle';
  // Each demo exercise keeps its own code for as long as the tab is open.
  const [codes, setCodes] = useState(() => sampleExercises.map((item) => item.starterCode));
  const code = codes[exerciseIndex] ?? exercise.starterCode;
  const setCode = useCallback((value: string) => {
    setCodes((previous) => previous.map((item, index) => (index === exerciseIndex ? value : item)));
  }, [exerciseIndex]);
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);
  // Width of the output column chosen with the resizer; null means the default responsive width.
  const [outputWidth, setOutputWidth] = useState<number | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const runner = usePythonRunner();
  const run = useCallback(() => { void runner.run(code, t.inputUnavailable, turtleEnabled); }, [runner.run, code, t.inputUnavailable, turtleEnabled]);
  const selectExercise = useCallback((index: number) => {
    if (index < 0 || index >= sampleExercises.length || index === exerciseIndex) return;
    setExerciseIndex(index);
    runner.clear();
  }, [exerciseIndex, runner.clear]);
  const output = <OutputPanel messages={t} locale={locale} status={runner.status} result={runner.result} stdout={runner.output.stdout} stderr={runner.output.stderr} truncated={runner.truncated} drawing={runner.drawing} />;
  const runtimeLabel = runner.drawing ? t.turtleDrawing : runner.status === 'error' ? t.pythonError : t[runner.status];

  return (
    <main className="page">
      <header className="exercise-header">
        <div>
          <p className="eyebrow">{t.lessonLabel}</p>
          <h1>{exercise.title}</h1>
          <p className="exercise-description">{t.lessonDescription}</p>
        </div>
        <SampleExercisePicker
          exercises={sampleExercises}
          selectedIndex={exerciseIndex}
          disabled={runner.isBusy}
          labels={{ navigation: t.sampleExercises, previous: t.previousExercise, next: t.nextExercise }}
          onSelect={selectExercise}
        />
      </header>
      <div
        className={`exercise-layout${instructionsCollapsed ? ' instructions-collapsed' : ''}${turtleEnabled ? ' has-turtle' : ''}`}
        style={outputWidth === null ? undefined : { '--output-width': `${outputWidth}px` } as CSSProperties}
      >
        <aside className="instructions-panel" aria-labelledby="instructions-title">
          <div className="panel-heading instructions-heading">
            <h2 id="instructions-title">{t.instructions}</h2>
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
            <span className="exercise-number">{t.exerciseLabel} {String(exerciseIndex + 1).padStart(2, '0')}</span>
            <MarkdownInstructions markdown={exercise.instructionsMarkdown} />
            <div className="tip">
              <h3>{t.tipTitle}</h3>
              <p>{turtleEnabled ? t.turtleTip : t.tip}</p>
            </div>
          </div>
        </aside>
        <section ref={editorRef} className="editor-panel" aria-labelledby="editor-title">
          <div className="panel-heading">
            <h2 id="editor-title">{t.editorTitle}</h2>
            <span className="language-badge">Python</span>
          </div>
          <Suspense fallback={<div className="code-editor editor-loading" role="status">{t.loadingEditor}</div>}>
            <CodeEditor key={exercise.id} value={code} onChange={setCode} onRun={run} label={t.editorLabel} helpId="editor-help" />
          </Suspense>
          <p id="editor-help" className="sr-only">{t.editorHelp}</p>
          <div className="editor-toolbar">
            <div className="run-controls">
              <button type="button" className="button button-primary" onClick={run} disabled={runner.isBusy} aria-keyshortcuts="Control+Enter Meta+Enter">
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 13 8l-9 5.5z" fill="currentColor" /></svg>
                {runner.status === 'error' ? t.retry : t.run}
              </button>
              {runner.isBusy
                ? <button type="button" className="button button-stop" onClick={runner.stop}><span className="stop-symbol" aria-hidden="true" />{t.stop}</button>
                : <span className="shortcut">{t.shortcut}</span>}
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
      <footer className="page-footer">{t.localNotice}</footer>
    </main>
  );
}
