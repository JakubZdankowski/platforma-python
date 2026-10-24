/// <reference lib="webworker" />
import type { PyodideAPI } from 'pyodide';
import type { PyProxy } from 'pyodide/ffi';
import executeSource from './execute.py?raw';
import { detectInputSupport, type InputSupport } from './inputSupport';
import { OutputBuffer } from './OutputBuffer';
import type { WorkerRequest, WorkerResponse } from './protocol';
import { parseTurtleMessage, TurtleBatcher, turtleSource } from './turtleBridge';
import { MAX_TURTLE_COMMANDS } from '../turtle/turtleTypes';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let python: PyodideAPI | undefined;
let inputSupport: InputSupport = 'initialization-failed';
let active = false;
let nextRequestId = 0;
let waiting: { runId: number; requestId: number; resolve: (value: string) => void } | undefined;

function send(message: WorkerResponse): void {
  scope.postMessage(message);
}

interface PythonResult {
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  traceback?: string;
}

async function initialize(indexURL: string): Promise<void> {
  // Runtime files are copied intact; Vite must not rewrite Emscripten's imports.
  const loaderURL = new URL('pyodide.mjs', indexURL).href;
  const { loadPyodide } = (await import(/* @vite-ignore */ loaderURL)) as typeof import('pyodide');
  python = await loadPyodide({ indexURL, stdout: () => {}, stderr: () => {} });
  python.setStdin({ stdin: () => null });
  inputSupport = await detectInputSupport(
    WebAssembly as unknown as { Suspending?: unknown; promising?: unknown },
    () => python!.runPythonAsync('from pyodide.ffi import run_sync\nfrom js import Promise\nrun_sync(Promise.resolve(True))'),
    (error) => console.error('[python-worker] Input initialization failed', error),
  );
  send({ type: 'ready', inputSupported: inputSupport === 'supported' });
}

async function execute(request: Extract<WorkerRequest, { type: 'run' }>): Promise<void> {
  if (!python) throw new Error('Python worker is not initialized.');
  const { runId, code, inputUnavailableMessage, inputInitializationFailedMessage, turtle } = request;
  // Buffered text always shares one turtleIndex: it is flushed before each new command is counted.
  let turtleCount = 0;
  const output = new OutputBuffer(
    (stream, text) => send({ type: 'output', runId, stream, text, turtleIndex: turtleCount }),
    () => send({ type: 'output-truncated', runId, turtleIndex: turtleCount }),
  );
  const turtleBatch = new TurtleBatcher((commands, truncated) => send({ type: 'turtle', runId, commands, truncated }));
  const stdoutDecoder = new TextDecoder();
  const stderrDecoder = new TextDecoder();
  python.setStdout({ write: (bytes: Uint8Array) => {
    output.append('stdout', stdoutDecoder.decode(bytes, { stream: true }));
    return bytes.length;
  } });
  python.setStderr({ write: (bytes: Uint8Array) => {
    output.append('stderr', stderrDecoder.decode(bytes, { stream: true }));
    return bytes.length;
  } });

  const globals = python.toPy({
    _source: code,
    _input_supported: inputSupport === 'supported',
    _input_message: inputSupport === 'missing-jspi' ? inputUnavailableMessage : (inputInitializationFailedMessage ?? 'Interactive input() initialization failed. Reload the page and try again. [INPUT_INIT_FAILED]'),
    _turtle_source: turtle ? turtleSource : '',
    _turtle_limit: MAX_TURTLE_COMMANDS,
  }) as PyProxy;
  globals.set('_turtle_send', (json: string) => {
    const message = parseTurtleMessage(json);
    if (message === 'truncated') turtleBatch.markTruncated();
    else if (message) {
      output.flush();
      turtleCount++;
      turtleBatch.add(message);
    }
  });
  let waitingMs = 0;
  globals.set('_input_read', () => {
    output.flush();
    turtleBatch.flush();
    const requestId = ++nextRequestId;
    const waitStarted = performance.now();
    return new Promise<string>((resolve) => {
      waiting = { runId, requestId, resolve: (value) => {
        waitingMs += performance.now() - waitStarted;
        resolve(value);
      } };
      send({ type: 'input-request', runId, requestId, turtleIndex: turtleCount });
    });
  });
  const startedAt = performance.now();
  try {
    const serialized: unknown = await python.runPythonAsync(executeSource, { globals });
    if (typeof serialized !== 'string') throw new Error('Invalid execution result.');
    const result = JSON.parse(serialized) as PythonResult;
    output.append('stdout', stdoutDecoder.decode());
    output.append('stderr', stderrDecoder.decode());
    output.flush();
    turtleBatch.flush();
    send({ type: 'finished', runId, durationMs: performance.now() - startedAt - waitingMs, ...result });
  } finally {
    waiting = undefined;
    globals.destroy();
  }
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === 'initialize') {
    void initialize(request.indexURL).catch((error: unknown) => {
      console.error('[python-worker] Initialization failed', error);
      send({ type: 'fatal' });
    });
  } else if (request.type === 'input-response') {
    if (!waiting || waiting.runId !== request.runId || waiting.requestId !== request.requestId || /[\r\n]/.test(request.value)) return;
    const pending = waiting;
    waiting = undefined;
    pending.resolve(request.value);
  } else if (!active) {
    active = true;
    void execute(request).catch((error: unknown) => {
      console.error('[python-worker] Execution infrastructure failed', error);
      send({ type: 'fatal' });
    }).finally(() => { active = false; });
  }
};
