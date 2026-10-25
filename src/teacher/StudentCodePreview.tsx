import { lazy, Suspense, useState } from 'react';
import { Button } from '../app/ui/Button';
import { Icon } from '../app/ui/Icon';
import { MarkdownInstructions } from '../markdown/MarkdownInstructions';
import type { Locale, Messages } from '../i18n/en';
import { OutputPanel } from '../output/OutputPanel';
import { usePythonRunner } from '../runtime/usePythonRunner';
import { TurtlePanel } from '../turtle/TurtlePanel';

const CodeEditor = lazy(() => import('../editor/CodeEditor').then(module => ({ default: module.CodeEditor })));

export function StudentCodePreview({ code, turtleEnabled, messages: t, locale, exerciseTitle, instructionsMarkdown }: {
  code: string; turtleEnabled: boolean; messages: Messages; locale: Locale;
  exerciseTitle?: string; instructionsMarkdown?: string;
}) {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const runner = usePythonRunner();
  const run = () => { if (!runner.isBusy) void runner.run(code, t.inputUnavailable, turtleEnabled, t.inputInitializationFailed); };
  return <div className="live-code-preview">
    {instructionsMarkdown !== undefined && <div className="live-preview-instructions">
      <div className="live-instructions-rail"><Button type="button" unstyled aria-label="Treść ćwiczenia" title="Treść ćwiczenia" aria-expanded={instructionsOpen} aria-controls="live-instructions-content" onClick={() => setInstructionsOpen(open => !open)}><Icon kind="file" /><span aria-hidden="true">{instructionsOpen ? '−' : '+'}</span></Button></div>
      <aside id="live-instructions-content" className="live-instructions-content" hidden={!instructionsOpen} aria-label="Treść ćwiczenia">
        <h2>{exerciseTitle}</h2><MarkdownInstructions markdown={instructionsMarkdown} />
      </aside>
    </div>}
    <div className="live-preview-editor">
      <div className="panel-heading"><h2>Kod ucznia <span className="live-readonly">tylko do odczytu</span></h2><div className="editor-toolbar editor-header-actions"><div className="run-controls">
        <Button type="button" variant="primary" size="compact" onClick={run} disabled={runner.isBusy}>{t.run}</Button>
        {runner.isBusy && <Button type="button" variant="danger" size="compact" onClick={runner.stop}>{t.stop}</Button>}
      </div></div></div>
      <div className="live-code-container"><Suspense fallback={<p role="status">{t.loadingEditor}</p>}>
        <CodeEditor value={code} readOnly label={t.studentCodeLabel} helpId="live-editor-help" />
      </Suspense></div>
      <p id="live-editor-help" className="sr-only">{t.readOnlyHelp}</p>
    </div>
    <div className="live-preview-output">
      {turtleEnabled && <TurtlePanel messages={t} drawing={runner.turtle} speed={runner.turtleSpeed}
        onSpeedChange={runner.setTurtleSpeed} canSkip={runner.isBusy} onSkip={runner.skipAnimation} />}
      <OutputPanel messages={t} locale={locale} status={runner.status} result={runner.result}
        stdout={runner.output.stdout} stderr={runner.output.stderr} truncated={runner.truncated}
        drawing={runner.drawing} input={runner.input} onSubmitInput={runner.submitInput} />
    </div>
  </div>;
}
