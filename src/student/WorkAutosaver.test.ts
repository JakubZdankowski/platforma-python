import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkAutosaver, type WorkPatch } from './WorkAutosaver';

afterEach(() => vi.useRealTimers());
describe('student autosave ordering and recovery', () => {
  it('debounces edits for 1.5 seconds', async () => {
    vi.useFakeTimers();
    const write = vi.fn(async () => {});
    const saver = new WorkAutosaver('starter', 'not_started', write, () => {});
    saver.change('first');
    await vi.advanceTimersByTimeAsync(1000);
    saver.change('second');
    await vi.advanceTimersByTimeAsync(1499);
    expect(write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(write).toHaveBeenCalledWith({ code: 'second', status: 'in_progress' });
    saver.dispose();
  });
  it('serializes a newer edit behind an in-flight save and never reports it saved early', async () => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const patches: WorkPatch[] = [];
    const notify = vi.fn();
    const saver = new WorkAutosaver('starter', 'not_started', async (patch) => {
      patches.push(patch);
      if (patches.length === 1) await blocked;
    }, notify);
    saver.change('first');
    const saving = saver.flush();
    await Promise.resolve();
    saver.change('latest');
    expect(notify).not.toHaveBeenCalledWith('saved');
    expect(saver.flush()).toBe(saving);
    release();
    expect(await saving).toBe(true);
    expect(patches.map((patch) => patch.code)).toEqual(['first', 'latest']);
    expect(notify).toHaveBeenLastCalledWith('saved');
    saver.dispose();
  });
  it('keeps the newest code and run result after a failed request and retries', async () => {
    vi.useFakeTimers();
    const write = vi.fn(async (_patch: WorkPatch) => {}).mockRejectedValueOnce(new Error('offline'));
    const notify = vi.fn();
    const saver = new WorkAutosaver('starter', 'not_started', write, notify);
    saver.change('bad code');
    expect(await saver.flush()).toBe(false);
    expect(notify).toHaveBeenLastCalledWith('error');
    saver.recordRun({ success: false, outcome: 'python-error', errorType: 'SyntaxError', errorMessage: 'invalid syntax' });
    await saver.flush();
    expect(write).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'bad code', last_error_type: 'SyntaxError', last_run_success: false }));
    saver.change('corrected');
    write.mockRejectedValueOnce(new Error('offline'));
    expect(await saver.flush()).toBe(false);
    await vi.advanceTimersByTimeAsync(3000);
    expect(notify).toHaveBeenLastCalledWith('saved');
    saver.recordRun({ success: true, outcome: 'success' });
    await saver.flush();
    expect(write).toHaveBeenLastCalledWith(expect.objectContaining({ code: 'corrected', last_error_type: null, last_error_summary: null, last_run_success: true }));
    saver.dispose();
  });
});
