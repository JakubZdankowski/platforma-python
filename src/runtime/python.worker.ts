/// <reference lib="webworker" />
import type { PyodideAPI } from 'pyodide';
import type { PyProxy } from 'pyodide/ffi';
import executeSource from './execute.py?raw';
import { OutputBuffer } from './OutputBuffer';
import type { WorkerRequest, WorkerResponse } from './protocol';
import { parseTurtleMessage, TurtleBatcher, turtleSource } from './turtleBridge';
import { MAX_TURTLE_COMMANDS } from '../turtle/turtleTypes';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let python: PyodideAPI | undefined;

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
  send({ type: 'ready' });
}

function execute(request: Extract<WorkerRequest, { type: 'run' }>): void {
  if (!python) throw new Error('Python worker is not initialized.');
  const { runId, code, inputUnavailableMessage, turtle } = request;
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
    _input_message: inputUnavailableMessage,
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
  const startedAt = performance.now();
  try {
    const serialized: unknown = python.runPython(executeSource, { globals });
    if (typeof serialized !== 'string') throw new Error('Invalid execution result.');
    const result = JSON.parse(serialized) as PythonResult;
    output.append('stdout', stdoutDecoder.decode());
    output.append('stderr', stderrDecoder.decode());
    output.flush();
    turtleBatch.flush();
    send({ type: 'finished', runId, durationMs: performance.now() - startedAt, ...result });
  } finally {
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
  } else {
    try {
      execute(request);
    } catch (error: unknown) {
      console.error('[python-worker] Execution infrastructure failed', error);
      send({ type: 'fatal' });
    }
  }
};
