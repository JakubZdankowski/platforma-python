export const DEFAULT_TIMEOUT_MS = 10_000;
export const INITIALIZATION_TIMEOUT_MS = 60_000;
export const MAX_OUTPUT_CHARS = 50_000;

export type RunnerStatus = 'idle' | 'loading' | 'running' | 'ready' | 'error';
export type ExecutionOutcome = 'success' | 'python-error' | 'stopped' | 'timeout' | 'runtime-error';
export type OutputStream = 'stdout' | 'stderr';

export interface ExecutionResult {
  success: boolean;
  outcome: ExecutionOutcome;
  stdout: string;
  stderr: string;
  durationMs: number;
  outputTruncated: boolean;
  errorType?: string;
  errorMessage?: string;
  traceback?: string;
}

export type WorkerRequest =
  | { type: 'initialize'; indexURL: string }
  | { type: 'run'; runId: number; code: string; inputUnavailableMessage: string };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'fatal' }
  | { type: 'output'; runId: number; stream: OutputStream; text: string }
  | { type: 'output-truncated'; runId: number }
  | {
      type: 'finished';
      runId: number;
      success: boolean;
      durationMs: number;
      errorType?: string;
      errorMessage?: string;
      traceback?: string;
    };

export type RunnerEvent =
  | { type: 'status'; status: RunnerStatus }
  | { type: 'output'; stream: OutputStream; text: string }
  | { type: 'output-truncated' };
