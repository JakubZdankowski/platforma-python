import { Button } from '../app/ui/Button';
import { Icon } from '../app/ui/Icon';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  completed?: boolean;
  switching?: boolean;
  onCompletedChange?: (completed: boolean) => void;
}

export function ExercisePage({ messages: t, locale, exercise, exercises, exerciseIndex, code, onChange: setCode,
  onSelect, lessonTitle, saveStatus, beforeRun, onRunResult, onReset, backLink, warning, readOnly = false, completed, onCompletedChange, switching = false }: Props) {
  const turtleEnabled = exercise.runtimeType === 'python-turtle';
  const [activePanel, setActivePanel] = useState<'instructions' | 'contents' | null>('instructions');
  useEffect(() => { setActivePanel('instructions'); }, [exercise.id]);
  const instructionsCollapsed = activePanel === null;
  // Width of the drawing column chosen with the resizer; null uses the responsive default.
  const [outputWidth, setOutputWidth] = useState<number | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const runner = usePythonRunner();
  const [preparing, setPreparing] = useState(false);
  const preparingRef = useRef(false);
  const run = useCallback(() => {
    if (readOnly || switching || preparingRef.current || runner.isBusy) return;
    preparingRef.current = true;
    setPreparing(true);
    void (async () => {
      try {
        if (beforeRun && !await beforeRun()) return;
        const result = await runner.run(code, t.inputUnavailable, turtleEnabled, t.inputInitializationFailed);
        if (result) onRunResult?.(result);
      } finally { preparingRef.current = false; setPreparing(false); }
    })();
  }, [readOnly, switching, runner.run, runner.isBusy, code, t.inputUnavailable, t.inputInitializationFailed, turtleEnabled, beforeRun, onRunResult]);
  const selectExercise = useCallback((index: number) => {
    if (index < 0 || index >= exercises.length || index === exerciseIndex || preparingRef.current) return;
    void onSelect(index);
    runner.clear();
  }, [exerciseIndex, exercises.length, onSelect, runner.clear]);
  const output = <OutputPanel messages={t} locale={locale} status={runner.status} result={runner.result} stdout={runner.output.stdout} stderr={runner.output.stderr} truncated={runner.truncated} drawing={runner.drawing} input={runner.input} onSubmitInput={runner.submitInput} />;

  return (
    <main className={`page${saveStatus ? ' saved-exercise' : ''}`}>
      {backLink && <h1 className="sr-only">{exercise.title}</h1>}
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
          disabled={runner.isBusy || preparing || switching}
          labels={{ navigation: lessonTitle ? t.lessonExercises : t.sampleExercises, previous: t.previousExercise, next: t.nextExercise, exercises: t.exercises }}
          onSelect={selectExercise}
        />
      </header>
      {warning && <div className="work-warning" role="alert">{warning}</div>}
      <div
        className={`exercise-layout lesson-workspace console-below${instructionsCollapsed ? ' lesson-panel-collapsed' : ''}${turtleEnabled ? ' has-turtle' : ''}`}
        style={{ ...(outputWidth === null ? {} : { '--output-width': `${outputWidth}px` }), ...(sidebarWidth === null ? {} : { '--sidebar-width': `${sidebarWidth}px` }) } as CSSProperties}
      >
        <nav className="lesson-tool-rail" aria-label={t.lessonPanels}>
          <Button unstyled type="button" aria-label={t.instructions} title={t.instructions} aria-expanded={activePanel === 'instructions'} aria-controls="lesson-side-panel" onClick={() => setActivePanel((panel) => panel === 'instructions' ? null : 'instructions')}>
            <Icon kind="file" />
          </Button>
          <Button unstyled type="button" aria-label={t.lessonExercises} title={t.lessonExercises} aria-expanded={activePanel === 'contents'} aria-controls="lesson-side-panel" onClick={() => setActivePanel((panel) => panel === 'contents' ? null : 'contents')}>
            <Icon kind="list" />
          </Button>
        </nav>
        <aside ref={sidebarRef} id="lesson-side-panel" className="instructions-panel" aria-labelledby="instructions-title" hidden={instructionsCollapsed}>
          <PanelResizer side="left" label={t.resizeSidebar} editorRef={editorRef} outputRef={sidebarRef} onResize={setSidebarWidth} />
          {activePanel === 'contents'
            ? <div className="panel-heading"><h2 id="instructions-title">{lessonTitle ?? t.lessonExercises}</h2></div>
            : <h2 id="instructions-title" className="sr-only">{exercise.title}</h2>}
          <div className="instructions-content">
            {activePanel === 'contents' ? <ol className="lesson-contents-list">{exercises.map((item, index) => <li key={item.id}><Button unstyled type="button" aria-current={index === exerciseIndex ? 'step' : undefined} disabled={runner.isBusy || preparing || switching} onClick={() => selectExercise(index)}><Icon kind="code" /><span>{item.title}</span></Button></li>)}</ol> : <>
              <span className="exercise-number">{exercise.title}</span>
              <MarkdownInstructions key={`markdown-${exercise.id}`} markdown={exercise.instructionsMarkdown} />
            </>}
          </div>
        </aside>
        <div className="coding-workspace">
          <section ref={editorRef} className="editor-panel" aria-labelledby="editor-title">
            <div className="panel-heading">
              <h2 id="editor-title">{t.editorTitle}</h2>
              <div className="editor-toolbar editor-header-actions">
                <div className="run-controls">
                  <Button type="button" variant="primary" onClick={run} disabled={readOnly || runner.isBusy || preparing || switching} aria-keyshortcuts="Control+Enter Meta+Enter">
                    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5 13 8l-9 5.5z" fill="currentColor" /></svg>
                    {runner.status === 'error' ? t.retry : t.run}
                  </Button>
                  {runner.isBusy
                    ? <Button type="button" variant="danger" onClick={runner.stop}><span className="stop-symbol" aria-hidden="true" />{t.stop}</Button>
                    : <span className="shortcut">{t.shortcut}</span>}
                  {onReset && <Button type="button" variant="secondary" size="compact" className="reset-code-button" aria-label={t.resetCode} title={t.resetCode} disabled={readOnly || runner.isBusy || preparing}
                    onClick={() => { if (window.confirm(t.confirmResetCode)) { onReset(); runner.clear(); } }}><Icon kind="refresh" size={18} /></Button>}
                </div>
              </div>
            </div>
            <Suspense fallback={<div className="code-editor editor-loading" role="status">{t.loadingEditor}</div>}>
              <CodeEditor key={exercise.id} value={code} onChange={setCode} onRun={run} label={t.editorLabel} helpId="editor-help" readOnly={readOnly} />
            </Suspense>
            <p id="editor-help" className="sr-only">{t.editorHelp}</p>
          </section>
          {output}
        </div>
        {turtleEnabled && <div ref={outputRef} className="output-column">
          <PanelResizer label={t.resizePanels} editorRef={editorRef} outputRef={outputRef} onResize={setOutputWidth} />
          <TurtlePanel
            messages={t}
            drawing={runner.turtle}
            speed={runner.turtleSpeed}
            onSpeedChange={runner.setTurtleSpeed}
            canSkip={runner.isBusy}
            onSkip={runner.skipAnimation}
          />
        </div>}
      </div>
      <footer className="page-footer">{saveStatus ? t.savedNotice : t.localNotice}</footer>
    </main>
  );
}
