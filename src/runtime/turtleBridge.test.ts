import { describe, expect, it, vi } from 'vitest';
import { parseTurtleMessage, TurtleBatcher } from './turtleBridge';
import type { TurtleCommand } from '../turtle/turtleTypes';

describe('parseTurtleMessage', () => {
  it('accepts every supported command', () => {
    const commands = [
      { type: 'forward', distance: 100 }, { type: 'backward', distance: 5 },
      { type: 'left', angle: 90 }, { type: 'right', angle: 45.5 }, { type: 'setheading', angle: -90 },
      { type: 'goto', x: 50, y: -70 }, { type: 'circle', radius: -20, extent: 360 },
      { type: 'color', color: 'red' }, { type: 'color', color: '#ff8800' }, { type: 'pensize', width: 3 },
      { type: 'penup' }, { type: 'pendown' }, { type: 'home' }, { type: 'clear' }, { type: 'hideturtle' }, { type: 'showturtle' },
    ];
    expect(commands.map((command) => parseTurtleMessage(JSON.stringify(command)))).toEqual(commands);
  });

  it('drops malformed commands and extra fields', () => {
    const invalid = [
      { type: 'forward', distance: '100' }, { type: 'goto', x: 1 }, { type: 'color', color: 'red;background:url(x)' },
      { type: 'pensize', width: -1 }, { type: 'explode' }, null, [], 5,
    ];
    for (const message of invalid) expect(parseTurtleMessage(JSON.stringify(message))).toBeNull();
    expect(parseTurtleMessage('not json')).toBeNull();
    expect(parseTurtleMessage(JSON.stringify({ type: 'penup', extra: '<script>' }))).toEqual({ type: 'penup' });
  });

  it('recognizes the truncation notice', () => {
    expect(parseTurtleMessage('{"type":"truncated"}')).toBe('truncated');
  });
});

describe('TurtleBatcher', () => {
  it('batches by count and time and reports truncation once', () => {
    const emit = vi.fn<(commands: TurtleCommand[], truncated: boolean) => void>();
    let clock = 0;
    const batcher = new TurtleBatcher(emit, () => clock);
    for (let i = 0; i < 499; i++) batcher.add({ type: 'penup' });
    expect(emit).not.toHaveBeenCalled();
    batcher.add({ type: 'pendown' });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0]![0]).toHaveLength(500);
    batcher.add({ type: 'home' });
    clock = 40;
    batcher.add({ type: 'clear' });
    expect(emit).toHaveBeenLastCalledWith([{ type: 'home' }, { type: 'clear' }], false);
    batcher.markTruncated();
    batcher.flush();
    expect(emit).toHaveBeenLastCalledWith([], true);
    expect(emit).toHaveBeenCalledTimes(3);
  });
});
