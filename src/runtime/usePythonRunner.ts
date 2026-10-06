import { useCallback, useEffect, useRef, useState } from 'react';
import { PythonRunner } from './PythonRunner';
import type { ExecutionResult, RunnerStatus } from './protocol';

export function usePythonRunner() {
  const [runner] = useState(() => new PythonRunner());
  const [status, setStatus] = useState<RunnerStatus>('idle');
  const [output, setOutput] = useState({ stdout: '', stderr: '' });
  const [truncated, setTruncated] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = runner.subscribe((event) => {
      if (event.type === 'status') setStatus(event.status);
      else if (event.type === 'output-truncated') setTruncated(true);
      else setOutput((previous) => ({ ...previous, [event.stream]: previous[event.stream] + event.text }));
    });
    return () => { mounted.current = false; unsubscribe(); runner.dispose(); };
  }, [runner]);

  const run = useCallback(async (code: string, inputUnavailableMessage: string) => {
    if (busy.current) return;
    busy.current = true;
    setOutput({ stdout: '', stderr: '' });
    setTruncated(false);
    setResult(null);
    try {
      const execution = await runner.run(code, { inputUnavailableMessage });
      if (mounted.current) setResult(execution);
    } finally {
      busy.current = false;
    }
  }, [runner]);

  const stop = useCallback(() => runner.stop(), [runner]);
  return { run, stop, status, output, result, truncated, isBusy: status === 'loading' || status === 'running' };
}
