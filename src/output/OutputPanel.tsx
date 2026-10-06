import type { Messages, Locale } from '../i18n/en';
import type { ExecutionResult, RunnerStatus } from '../runtime/protocol';

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
}

export function OutputPanel({ messages: t, locale, status, result, stdout, stderr, truncated, drawing = false }: Props) {
  const runnerBusy = status === 'loading' || status === 'running';
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
      <div className="output-body" tabIndex={0} aria-labelledby="console-title">
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
    </section>
  );
}
