import { describe, expect, it } from 'vitest';
import { currentWork, latestRun, workActivity, type StudentWork } from './liveWorkService';

const now = Date.parse('2026-10-07T12:00:00Z');
function work(overrides: Partial<StudentWork> = {}): StudentWork {
  return { student_id: 'ania', exercise_id: 'one', code: 'print(1)', status: 'in_progress',
    last_edited_at: new Date(now).toISOString(), last_run_at: null, last_run_success: null,
    last_error_type: null, last_error_summary: null, ...overrides };
}
describe('class work summaries', () => {
  it('selects the newest edit for each student independently of the newest run', () => {
    const previous = work({ last_edited_at: new Date(now - 60_000).toISOString(), last_run_at: new Date(now).toISOString() });
    const current = work({ exercise_id: 'two', last_run_at: new Date(now - 60_000).toISOString() });
    const rows = [previous, current, work({ student_id: 'ola', exercise_id: 'three' })];
    expect(currentWork(rows, 'ania')).toBe(current);
    expect(latestRun(rows, 'ania')).toBe(previous);
    expect(currentWork(rows, 'unknown')).toBeUndefined();
    expect(latestRun(rows, 'ola')).toBeUndefined();
  });
  it('handles activity boundaries as time passes, including opened but unedited starter code', () => {
    expect(workActivity(undefined, now)).toEqual({ kind: 'not-started' });
    expect(workActivity(work({ status: 'not_started' }), now)).toEqual({ kind: 'not-started' });
    const row = work();
    expect(workActivity(row, now + 29_999)).toEqual({ kind: 'typing' });
    expect(workActivity(row, now + 30_000)).toEqual({ kind: 'active' });
    expect(workActivity(row, now + 119_999)).toEqual({ kind: 'active' });
    expect(workActivity(row, now + 120_000)).toEqual({ kind: 'idle', minutes: 2 });
    expect(workActivity(row, now + 300_000)).toEqual({ kind: 'idle', minutes: 5 });
  });
  it('counts a recent run as activity without mistaking it for typing', () => {
    const row = work({ last_edited_at: new Date(now - 600_000).toISOString(), last_run_at: new Date(now - 5000).toISOString() });
    expect(workActivity(row, now)).toEqual({ kind: 'active' });
    expect(workActivity(work({ last_edited_at: new Date(now + 5000).toISOString() }), now)).toEqual({ kind: 'typing' });
  });
});
