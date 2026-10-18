import type { TurtleCommand } from '../turtle/turtleTypes';

export const DEFAULT_TIMEOUT_MS = 10_000;
export const INITIALIZATION_TIMEOUT_MS = 60_000;
export const MAX_OUTPUT_CHARS = 50_000;

export type RunnerStatus = 'idle' | 'loading' | 'running' | 'waiting-input' | 'ready' | 'error';
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

export interface InputRequest { requestId: number; turtleIndex: number }

export type WorkerRequest =
  | { type: 'initialize'; indexURL: string }
  | { type: 'input-response'; runId: number; requestId: number; value: string }
  | { type: 'run'; runId: number; code: string; inputUnavailableMessage: string; inputInitializationFailedMessage?: string; turtle: boolean };

export type WorkerResponse =
  | { type: 'ready'; inputSupported?: boolean }
  | ({ type: 'input-request'; runId: number } & InputRequest)
  | { type: 'fatal' }
  /** `turtleIndex`: Turtle commands emitted before this text; keeps the console in sync with the drawing. */
  | { type: 'output'; runId: number; stream: OutputStream; text: string; turtleIndex?: number }
  | { type: 'output-truncated'; runId: number; turtleIndex?: number }
  | { type: 'turtle'; runId: number; commands: TurtleCommand[]; truncated: boolean }
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
  | ({ type: 'input-request' } & InputRequest)
  | { type: 'output'; stream: OutputStream; text: string; turtleIndex: number }
  | { type: 'output-truncated'; turtleIndex: number }
  | { type: 'turtle'; commands: TurtleCommand[]; truncated: boolean };
