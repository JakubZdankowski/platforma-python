import { lazy, Suspense, useCallback, useState } from 'react';
import { sampleExercise } from '../exercises/sampleExercise';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';
import { OutputPanel } from '../output/OutputPanel';
import { usePythonRunner } from '../runtime/usePythonRunner';
import type { Messages, Locale } from '../i18n/en';

const CodeEditor = lazy(() => import('../editor/CodeEditor').then((module) => ({ default: module.CodeEditor })));

export function ExercisePage({ messages: t, locale }: { messages: Messages; locale: Locale }) {
  const [code, setCode] = useState(sampleExercise.starterCode);
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);
  const runner = usePythonRunner();
  const run = useCallback(() => { void runner.run(code, t.inputUnavailable); }, [runner.run, code, t.inputUnavailable]);
  const runtimeLabel = runner.status === 'error' ? t.runtimeError : t[runner.status];

  return (
    <main className="page">
      <header className="exercise-header">
        <p className="eyebrow">{t.lessonLabel}</p>
        <h1>{sampleExercise.title}</h1>
        <p>{t.lessonDescription}</p>
      </header>
      <div className={`exercise-layout${instructionsCollapsed ? ' instructions-collapsed' : ''}`}>
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
            <span className="exercise-number">{t.exerciseNumber}</span>
            <MarkdownInstructions markdown={sampleExercise.instructionsMarkdown} />
            <div className="tip">
              <h3>{t.tipTitle}</h3>
              <p>{t.tip}</p>
            </div>
          </div>
        </aside>
        <section className="editor-panel" aria-labelledby="editor-title">
          <div className="panel-heading">
            <h2 id="editor-title">{t.editorTitle}</h2>
            <span className="language-badge">Python</span>
          </div>
          <Suspense fallback={<div className="code-editor editor-loading" role="status">{t.loadingEditor}</div>}>
            <CodeEditor value={code} onChange={setCode} onRun={run} label={t.editorLabel} helpId="editor-help" />
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
            <span className="runtime-status"><span className={`status-dot ${runner.isBusy ? 'is-busy' : ''}`} aria-hidden="true" />{runner.status === 'error' ? t.pythonError : runtimeLabel}</span>
          </div>
        </section>
        <OutputPanel messages={t} locale={locale} status={runner.status} result={runner.result} stdout={runner.output.stdout} stderr={runner.output.stderr} truncated={runner.truncated} />
      </div>
      <footer className="page-footer">{t.localNotice}</footer>
    </main>
  );
}
