import { expect, it, vi } from 'vitest';
import { detectInputSupport } from './inputSupport';

const available = { Suspending: () => {}, promising: () => {} };

it('reports missing browser APIs without attempting the runtime probe', async () => {
  const probe = vi.fn();
  for (const wasm of [{}, { Suspending: available.Suspending }, { promising: available.promising }]) {
    expect(await detectInputSupport(wasm, probe, vi.fn())).toBe('missing-jspi');
  }
  expect(probe.mock.calls.length).toBe(0);
});

it('does not misdiagnose a runtime exception as missing browser support', async () => {
  const error = new Error('Runtime failed');
  const report = vi.fn();
  expect(await detectInputSupport(available, async () => { throw error; }, report)).toBe('initialization-failed');
  expect(report).toHaveBeenCalledWith(error);
});

it('requires a successful round trip', async () => {
  expect(await detectInputSupport(available, async () => false, vi.fn())).toBe('initialization-failed');
  expect(await detectInputSupport(available, async () => true, vi.fn())).toBe('supported');
});
