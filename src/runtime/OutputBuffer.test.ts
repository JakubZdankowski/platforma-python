import { describe, expect, it, vi } from 'vitest';
import { OutputBuffer } from './OutputBuffer';
import { MAX_OUTPUT_CHARS, type OutputStream } from './protocol';

describe('OutputBuffer', () => {
  it('batches a burst of output and preserves exact whitespace and Unicode', () => {
    const emit = vi.fn<(stream: OutputStream, text: string) => void>();
    let clock = 0;
    const buffer = new OutputBuffer(emit, vi.fn(), () => clock);
    buffer.append('stdout', 'ą');
    for (let i = 0; i < 1000; i++) buffer.append('stdout', ' ');
    buffer.append('stderr', 'błąd\n');
    expect(emit).toHaveBeenCalledTimes(1);
    clock = 40;
    buffer.append('stdout', 'ż');
    expect(emit).toHaveBeenNthCalledWith(2, 'stdout', ' '.repeat(1000) + 'ż');
    expect(emit).toHaveBeenNthCalledWith(3, 'stderr', 'błąd\n');
  });

  it('bounds total output and emits truncation only once', () => {
    const emit = vi.fn<(stream: OutputStream, text: string) => void>();
    const truncated = vi.fn();
    const buffer = new OutputBuffer(emit, truncated);
    buffer.append('stdout', 'x'.repeat(MAX_OUTPUT_CHARS - 1));
    buffer.append('stderr', 'error');
    buffer.append('stdout', 'more');
    buffer.flush();
    const size = emit.mock.calls.reduce((sum, [, value]) => sum + value.length, 0);
    expect(size).toBe(MAX_OUTPUT_CHARS);
    expect(truncated).toHaveBeenCalledOnce();
  });
});
