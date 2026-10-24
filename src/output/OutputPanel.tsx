import { useEffect, useRef, useState } from 'react';
import { Button } from '../app/ui/Button';
import type { Messages, Locale } from '../i18n/en';
import type { ExecutionResult, RunnerStatus, InputRequest } from '../runtime/protocol';

interface Props {
  messages: Messages;
  locale: Locale;
  status: RunnerStatus;
  result: ExecutionResult | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  /** The turtle is still drawing; the result is shown once it finishes. */
  drawing?: boolean;
  input?: InputRequest | null;
  onSubmitInput?: (requestId: number, value: string) => boolean;
}

export function OutputPanel({ messages: t, locale, status, result, stdout, stderr, truncated, drawing = false, input, onSubmitInput }: Props) {
  const outputBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (input && outputBody.current) outputBody.current.scrollTop = outputBody.current.scrollHeight;
  }, [input?.requestId]);
  const runnerBusy = status === 'loading' || status === 'running' || status === 'waiting-input';
  const busy = runnerBusy || drawing;
  const resultText = result ? {
    success: t.success,
    'python-error': t.pythonError,
    stopped: t.stopped,
    timeout: t.timeout,
    'runtime-error': t.runtimeError,
  }[result.outcome] : '';
  const statusText = drawing ? t.turtleDrawing : runnerBusy ? t[status] : resultText;
  const hasError = result?.outcome === 'python-error' || result?.outcome === 'runtime-error' || result?.outcome === 'timeout';

  return (
    <section className="output-panel" aria-labelledby="console-title">
      <div className="panel-heading output-heading">
        <h2 id="console-title">{t.console}</h2>
        {result && <span className="execution-time">{new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(result.durationMs)} ms</span>}
      </div>
      <div ref={outputBody} className="output-body" tabIndex={0} aria-labelledby="console-title">
        {statusText && <p role="status" className={`execution-status ${hasError ? 'has-error' : ''}`}>
          <span className={`status-dot ${busy ? 'is-busy' : ''}`} aria-hidden="true" />{statusText}
        </p>}
        {status === 'loading' && <p className="output-hint">{t.loadingHint}</p>}
        {stdout && <pre className="console-text" data-testid="stdout">{stdout}</pre>}
        {stderr && <div className="stderr-block"><span className="output-label">{t.stderr}</span><pre className="console-text" data-testid="stderr">{stderr}</pre></div>}
        {result?.outcome === 'python-error' && <div className="python-error">
          <p>{t.pythonErrorHint}</p>
          <pre data-testid="python-error">{result.traceback ?? `${result.errorType}: ${result.errorMessage}`}</pre>
        </div>}
        {truncated && <p className="output-notice">{t.outputTruncated}</p>}
        {!result && !busy && !stdout && !stderr && <div className="output-placeholder">
          <span className="console-symbol" aria-hidden="true">&gt;_</span>
          <div><p>{t.emptyOutput}</p><p>{t.emptyHint}</p></div>
        </div>}
        {result?.success && !stdout && !stderr && <p className="output-hint">{t.noOutput}</p>}
      </div>
        {input && onSubmitInput && <InputForm key={input.requestId} messages={t} onSubmit={(value) => onSubmitInput(input.requestId, value)} />}
    </section>
  );
}

function InputForm({ messages: t, onSubmit }: { messages: Messages; onSubmit: (value: string) => boolean }) {
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { field.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const reveal = () => form.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    reveal();
    // Keep the whole form visible when a mobile keyboard changes the viewport.
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', reveal);
    return () => viewport?.removeEventListener('resize', reveal);
  }, [invalid]);
  return <form ref={form} className="console-input" onSubmit={(event) => {
    event.preventDefault();
    if (!sent && !invalid && onSubmit(value)) setSent(true);
  }}>
    <label htmlFor="console-answer">{t.inputLabel}</label>
    <div className="console-input-row">
      <input id="console-answer" ref={field} value={value} disabled={sent} autoComplete="off"
        aria-invalid={invalid}
        aria-describedby={invalid ? 'console-input-error' : undefined}
        onPaste={(event) => {
          if (/[\r\n]/.test(event.clipboardData.getData('text'))) { event.preventDefault(); setInvalid(true); }
        }}
        onChange={(event) => { setValue(event.target.value); setInvalid(false); }} />
      <Button type="submit" disabled={sent || invalid}>{t.inputSend}</Button>
    </div>
    {invalid && <p id="console-input-error" role="alert">{t.inputSingleLine}</p>}
  </form>;
}
