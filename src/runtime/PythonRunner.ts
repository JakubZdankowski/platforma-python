import {
  DEFAULT_TIMEOUT_MS, INITIALIZATION_TIMEOUT_MS, MAX_OUTPUT_CHARS,
  type ExecutionOutcome, type ExecutionResult, type RunnerEvent,
  type RunnerStatus, type WorkerRequest, type WorkerResponse,
} from './protocol';
import { MAX_TURTLE_COMMANDS, type TurtleCommand } from '../turtle/turtleTypes';

export interface WorkerPort {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: WorkerRequest): void;
  terminate(): void;
}

interface RunOptions {
  inputUnavailableMessage: string;
  timeoutMs?: number;
  /** Provides the Turtle module and its functions as globals. */
  turtle?: boolean;
}

interface PendingRun {
  id: number;
  code: string;
  options: RunOptions;
  resolve: (result: ExecutionResult) => void;
  startedAt?: number;
  stdout: string;
  stderr: string;
  outputTruncated: boolean;
  turtleCommands: number;
  turtleTruncated: boolean;
}

interface RunnerOptions {
  createWorker?: () => WorkerPort;
  indexURL?: string;
  initializationTimeoutMs?: number;
}

/** UI-independent worker lifecycle. A pending run always settles, including Stop. */
export class PythonRunner {
  private worker?: WorkerPort;
  private pending?: PendingRun;
  private timer?: ReturnType<typeof setTimeout>;
  private nextId = 0;
  private status: RunnerStatus = 'idle';
  private readonly listeners = new Set<(event: RunnerEvent) => void>();

  constructor(private readonly options: RunnerOptions = {}) {}

  subscribe(listener: (event: RunnerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  run(code: string, options: RunOptions): Promise<ExecutionResult> {
    if (this.pending) return Promise.reject(new Error('A program is already running.'));
    return new Promise((resolve) => {
      this.pending = { id: ++this.nextId, code, options, resolve, stdout: '', stderr: '', outputTruncated: false, turtleCommands: 0, turtleTruncated: false };
      if (this.worker && this.status === 'ready') {
        this.startExecution();
        return;
      }
      this.setStatus('loading');
      this.timer = setTimeout(
        () => this.abort('runtime-error'),
        this.options.initializationTimeoutMs ?? INITIALIZATION_TIMEOUT_MS,
      );
      try {
        const worker: WorkerPort = this.options.createWorker?.() ?? new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
        this.worker = worker;
        worker.onmessage = (event) => {
          if (this.worker === worker) this.handleMessage(event.data);
        };
        worker.onerror = (event) => {
          event.preventDefault();
          if (this.worker === worker) this.abort('runtime-error');
        };
        worker.onmessageerror = () => {
          if (this.worker === worker) this.abort('runtime-error');
        };
        worker.postMessage({
          type: 'initialize',
          indexURL: this.options.indexURL ?? new URL(`${import.meta.env.BASE_URL}pyodide/`, window.location.origin).href,
        });
      } catch {
        this.abort('runtime-error');
      }
    });
  }

  stop(): void {
    if (this.pending) this.abort('stopped');
  }

  /** Lazy restart: the next run initializes a fresh interpreter. */
  restart(): void {
    this.stop();
    this.terminateWorker();
    this.setStatus('idle');
  }

  dispose(): void {
    this.listeners.clear();
    this.restart();
  }

  private startExecution(): void {
    const pending = this.pending;
    if (!pending || !this.worker) return;
    clearTimeout(this.timer);
    pending.startedAt = performance.now();
    this.setStatus('running');
    this.timer = setTimeout(() => this.abort('timeout'), pending.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      this.worker.postMessage({ type: 'run', runId: pending.id, code: pending.code, inputUnavailableMessage: pending.options.inputUnavailableMessage, turtle: pending.options.turtle ?? false });
    } catch {
      this.abort('runtime-error');
    }
  }

  private handleMessage(message: WorkerResponse): void {
    if (message.type === 'fatal') {
      this.abort('runtime-error');
      return;
    }
    if (message.type === 'ready') {
      if (this.status === 'loading') this.startExecution();
      return;
    }
    const pending = this.pending;
    if (!pending || message.runId !== pending.id || this.status !== 'running') return;
    if (message.type === 'output') {
      const remaining = MAX_OUTPUT_CHARS - pending.stdout.length - pending.stderr.length;
      const text = message.text.slice(0, remaining);
      pending[message.stream] += text;
      this.emit({ type: 'output', stream: message.stream, text, turtleIndex: message.turtleIndex ?? 0 });
      if (text.length < message.text.length) this.markTruncated(message.turtleIndex);
    } else if (message.type === 'output-truncated') {
      this.markTruncated(message.turtleIndex);
    } else if (message.type === 'turtle') {
      this.forwardTurtle(pending, message.commands, message.truncated);
    } else {
      this.finish({
        success: message.success,
        outcome: message.success ? 'success' : 'python-error',
        stdout: pending.stdout, stderr: pending.stderr,
        outputTruncated: pending.outputTruncated,
        durationMs: message.durationMs,
        errorType: message.errorType,
        errorMessage: message.errorMessage,
        traceback: message.traceback,
      }, 'ready');
    }
  }

  /** The Python module limits itself too; this cap also holds if a program bypasses it. */
  private forwardTurtle(pending: PendingRun, received: TurtleCommand[], truncated: boolean): void {
    if (pending.turtleTruncated) return;
    const commands = received.slice(0, MAX_TURTLE_COMMANDS - pending.turtleCommands);
    pending.turtleCommands += commands.length;
    pending.turtleTruncated = truncated || commands.length < received.length;
    if (commands.length > 0 || pending.turtleTruncated) {
      this.emit({ type: 'turtle', commands, truncated: pending.turtleTruncated });
    }
  }

  private markTruncated(turtleIndex = 0): void {
    if (!this.pending || this.pending.outputTruncated) return;
    this.pending.outputTruncated = true;
    this.emit({ type: 'output-truncated', turtleIndex });
  }

  private abort(outcome: Extract<ExecutionOutcome, 'stopped' | 'timeout' | 'runtime-error'>): void {
    const pending = this.pending;
    this.terminateWorker();
    const status = outcome === 'runtime-error' ? 'error' : 'idle';
    if (!pending) {
      this.setStatus(status);
      return;
    }
    this.finish({
      success: false, outcome, stdout: pending.stdout, stderr: pending.stderr,
      outputTruncated: pending.outputTruncated,
      durationMs: pending.startedAt === undefined ? 0 : performance.now() - pending.startedAt,
    }, status);
  }

  private finish(result: ExecutionResult, status: RunnerStatus): void {
    clearTimeout(this.timer);
    const pending = this.pending;
    this.pending = undefined;
    this.setStatus(status);
    pending?.resolve(result);
  }

  private terminateWorker(): void {
    clearTimeout(this.timer);
    if (!this.worker) return;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate();
    this.worker = undefined;
  }

  private setStatus(status: RunnerStatus): void {
    this.status = status;
    this.emit({ type: 'status', status });
  }

  private emit(event: RunnerEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
