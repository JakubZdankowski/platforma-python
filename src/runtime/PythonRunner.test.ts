import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PythonRunner, type WorkerPort } from './PythonRunner';
import { MAX_OUTPUT_CHARS, type RunnerEvent, type WorkerRequest, type WorkerResponse } from './protocol';
import { MAX_TURTLE_COMMANDS } from '../turtle/turtleTypes';

class FakeWorker implements WorkerPort {
  onmessage: WorkerPort['onmessage'] = null;
  onerror: WorkerPort['onerror'] = null;
  onmessageerror: WorkerPort['onmessageerror'] = null;
  postMessage = vi.fn<(message: WorkerRequest) => void>();
  terminate = vi.fn();
  send(message: WorkerResponse) { this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>); }
  get runId() {
    const request = this.postMessage.mock.calls.map(([message]) => message).reverse().find((message) => message.type === 'run');
    if (!request || request.type !== 'run') throw new Error('No run request');
    return request.runId;
  }
}

describe('PythonRunner', () => {
  let workers: FakeWorker[];
  let runner: PythonRunner;
  const options = { inputUnavailableMessage: 'Input is unavailable' };
  const latest = () => workers.at(-1)!;
  const finish = (worker: FakeWorker) => worker.send({ type: 'finished', runId: worker.runId, success: true, durationMs: 7 });

  beforeEach(() => {
    vi.useFakeTimers();
    workers = [];
    runner = new PythonRunner({
      indexURL: 'https://example.test/pyodide/',
      initializationTimeoutMs: 500,
      createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker; },
    });
  });
  afterEach(() => { runner.dispose(); vi.useRealTimers(); });

  it('waits for readiness and returns exact stdout and stderr', async () => {
    const result = runner.run('print("Hello")', options);
    expect(latest().postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'initialize', indexURL: 'https://example.test/pyodide/' });
    latest().send({ type: 'ready' });
    latest().send({ type: 'output', runId: latest().runId, stream: 'stdout', text: 'Hello\ną ć ę' });
    latest().send({ type: 'output', runId: latest().runId, stream: 'stderr', text: 'warning' });
    finish(latest());
    expect(await result).toMatchObject({ success: true, outcome: 'success', stdout: 'Hello\ną ć ę', stderr: 'warning', durationMs: 7 });
  });

  it('preserves structured Python errors and can execute again', async () => {
    const first = runner.run('1/0', options);
    latest().send({ type: 'ready' });
    latest().send({ type: 'finished', runId: latest().runId, success: false, durationMs: 1, errorType: 'ZeroDivisionError', traceback: 'division by zero' });
    expect(await first).toMatchObject({ outcome: 'python-error', errorType: 'ZeroDivisionError' });
    const second = runner.run('print(1)', options);
    expect(workers).toHaveLength(1);
    finish(latest());
    expect((await second).success).toBe(true);
  });

  it('settles Stop during loading, then creates a new worker', async () => {
    const first = runner.run('while True: pass', options);
    const oldWorker = latest();
    const staleCallback = oldWorker.onmessage!;
    runner.stop();
    expect(await first).toMatchObject({ outcome: 'stopped', durationMs: 0 });
    expect(oldWorker.terminate).toHaveBeenCalledOnce();
    const second = runner.run('print(2)', options);
    staleCallback({ data: { type: 'fatal' } } as MessageEvent<WorkerResponse>);
    latest().send({ type: 'ready' });
    finish(latest());
    expect((await second).success).toBe(true);
    expect(workers).toHaveLength(2);
  });

  it('terminates a running worker and keeps already received output', async () => {
    const result = runner.run('while True: print(1)', options);
    latest().send({ type: 'ready' });
    latest().send({ type: 'output', runId: latest().runId, stream: 'stdout', text: '1\n' });
    runner.stop();
    expect(await result).toMatchObject({ outcome: 'stopped', stdout: '1\n' });
    expect(latest().terminate).toHaveBeenCalledOnce();
  });

  it('starts the execution timeout only after initialization', async () => {
    const result = runner.run('while True: pass', { ...options, timeoutMs: 100 });
    vi.advanceTimersByTime(400);
    expect(latest().terminate).not.toHaveBeenCalled();
    latest().send({ type: 'ready' });
    vi.advanceTimersByTime(100);
    expect((await result).outcome).toBe('timeout');
    expect(latest().terminate).toHaveBeenCalledOnce();
  });

  it('times out initialization and allows retry', async () => {
    const result = runner.run('print(1)', options);
    vi.advanceTimersByTime(500);
    expect((await result).outcome).toBe('runtime-error');
    const retry = runner.run('print(1)', options);
    latest().send({ type: 'ready' });
    finish(latest());
    expect((await retry).success).toBe(true);
  });

  it('ignores stale run messages on a reused worker', async () => {
    const first = runner.run('print(1)', options);
    latest().send({ type: 'ready' });
    const oldId = latest().runId;
    finish(latest());
    await first;
    const second = runner.run('print(2)', options);
    latest().send({ type: 'output', runId: oldId, stream: 'stdout', text: 'stale' });
    latest().send({ type: 'finished', runId: oldId, success: true, durationMs: 0 });
    finish(latest());
    expect((await second).stdout).toBe('');
  });

  it('settles worker crashes and message decoding failures', async () => {
    const crashed = runner.run('print(1)', options);
    const preventDefault = vi.fn();
    latest().onerror?.({ preventDefault } as unknown as ErrorEvent);
    expect((await crashed).outcome).toBe('runtime-error');
    expect(preventDefault).toHaveBeenCalledOnce();
    const malformed = runner.run('print(2)', options);
    latest().onmessageerror?.({} as MessageEvent);
    expect((await malformed).outcome).toBe('runtime-error');
  });

  it('settles synchronous worker creation failures', async () => {
    runner.dispose();
    runner = new PythonRunner({ createWorker: () => { throw new Error('Unavailable'); } });
    expect((await runner.run('print(1)', options)).outcome).toBe('runtime-error');
  });

  it('rejects concurrent runs without disrupting the active run', async () => {
    const first = runner.run('print(1)', options);
    await expect(runner.run('print(2)', options)).rejects.toThrow('already running');
    latest().send({ type: 'ready' });
    finish(latest());
    expect((await first).success).toBe(true);
  });

  it('enforces an aggregate output limit', async () => {
    const result = runner.run('print("x")', options);
    latest().send({ type: 'ready' });
    latest().send({ type: 'output', runId: latest().runId, stream: 'stdout', text: 'x'.repeat(MAX_OUTPUT_CHARS - 2) });
    latest().send({ type: 'output', runId: latest().runId, stream: 'stderr', text: '12345' });
    finish(latest());
    expect(await result).toMatchObject({ stderr: '12', outputTruncated: true });
  });

  it('restart terminates an idle interpreter and dispose settles pending work', async () => {
    const first = runner.run('print(1)', options);
    latest().send({ type: 'ready' });
    finish(latest());
    await first;
    runner.restart();
    expect(latest().terminate).toHaveBeenCalledOnce();
    const next = runner.run('print(2)', options);
    expect(workers).toHaveLength(2);
    runner.dispose();
    expect((await next).outcome).toBe('stopped');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('requests Turtle only when enabled and forwards drawing commands of the current run', async () => {
    const events: RunnerEvent[] = [];
    runner.subscribe((event) => { if (event.type === 'turtle') events.push(event); });
    const result = runner.run('forward(100)', { ...options, turtle: true });
    latest().send({ type: 'ready' });
    expect(latest().postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'run', turtle: true }));
    latest().send({ type: 'turtle', runId: latest().runId - 1, commands: [{ type: 'penup' }], truncated: false });
    latest().send({ type: 'turtle', runId: latest().runId, commands: [{ type: 'forward', distance: 100 }], truncated: false });
    finish(latest());
    await result;
    expect(events).toEqual([{ type: 'turtle', commands: [{ type: 'forward', distance: 100 }], truncated: false }]);
    const consoleRun = runner.run('print(1)', options);
    expect(latest().postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'run', turtle: false }));
    finish(latest());
    await consoleRun;
  });

  it('passes the Turtle position of console output to listeners', async () => {
    const events: RunnerEvent[] = [];
    runner.subscribe((event) => { if (event.type !== 'status') events.push(event); });
    const result = runner.run('print(1)', { ...options, turtle: true });
    latest().send({ type: 'ready' });
    latest().send({ type: 'output', runId: latest().runId, stream: 'stdout', text: 'a', turtleIndex: 3 });
    latest().send({ type: 'output', runId: latest().runId, stream: 'stdout', text: 'b' });
    latest().send({ type: 'output-truncated', runId: latest().runId, turtleIndex: 4 });
    finish(latest());
    await result;
    expect(events).toEqual([
      { type: 'output', stream: 'stdout', text: 'a', turtleIndex: 3 },
      { type: 'output', stream: 'stdout', text: 'b', turtleIndex: 0 },
      { type: 'output-truncated', turtleIndex: 4 },
    ]);
  });

  it('enforces an aggregate Turtle command limit', async () => {
    const events: RunnerEvent[] = [];
    runner.subscribe((event) => { if (event.type === 'turtle') events.push(event); });
    const result = runner.run('while True: forward(1)', { ...options, turtle: true });
    latest().send({ type: 'ready' });
    const batch = (count: number) => ({ type: 'turtle' as const, runId: latest().runId, commands: Array.from({ length: count }, () => ({ type: 'forward' as const, distance: 1 })), truncated: false });
    latest().send(batch(MAX_TURTLE_COMMANDS - 1));
    latest().send(batch(3));
    latest().send(batch(3));
    finish(latest());
    await result;
    expect(events.map((event) => event.type === 'turtle' && [event.commands.length, event.truncated])).toEqual([[MAX_TURTLE_COMMANDS - 1, false], [1, true]]);
  });
});
