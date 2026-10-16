import { lazy, Suspense } from 'react';
import { Button } from '../app/ui/Button';
import type { Locale, Messages } from '../i18n/en';
import { OutputPanel } from '../output/OutputPanel';
import { usePythonRunner } from '../runtime/usePythonRunner';
import { TurtlePanel } from '../turtle/TurtlePanel';

const CodeEditor = lazy(() => import('../editor/CodeEditor').then(module => ({ default: module.CodeEditor })));

export function StudentCodePreview({ code, turtleEnabled, messages: t, locale }: {
  code: string; turtleEnabled: boolean; messages: Messages; locale: Locale;
}) {
  const runner = usePythonRunner();
  const run = () => { if (!runner.isBusy) void runner.run(code, t.inputUnavailable, turtleEnabled, t.inputInitializationFailed); };
  return <div className="live-code-preview">
    <div className="live-preview-editor">
      <div className="live-code-container"><Suspense fallback={<p role="status">{t.loadingEditor}</p>}>
        <CodeEditor value={code} readOnly label={t.studentCodeLabel} helpId="live-editor-help" />
      </Suspense></div>
      <p id="live-editor-help" className="sr-only">{t.readOnlyHelp}</p>
      <div className="editor-toolbar"><div className="run-controls">
        <Button type="button" variant="primary" onClick={run} disabled={runner.isBusy}>{t.run}</Button>
        {runner.isBusy && <Button type="button" variant="danger" onClick={runner.stop}>{t.stop}</Button>}
      </div></div>
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
