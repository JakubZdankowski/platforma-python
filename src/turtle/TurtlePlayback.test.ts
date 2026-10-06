import { describe, expect, it, vi } from 'vitest';
import type { ExecutionResult } from '../runtime/protocol';
import { TurtlePlayback, type FrameScheduler, type PlaybackView } from './TurtlePlayback';

class ManualFrames implements FrameScheduler {
  private callbacks = new Map<number, (time: number) => void>();
  private nextHandle = 1;
  time = 0;
  request(callback: (time: number) => void) { this.callbacks.set(this.nextHandle, callback); return this.nextHandle++; }
  cancel(handle: number) { this.callbacks.delete(handle); }
  get pending() { return this.callbacks.size; }
  /** Runs frames 50 ms apart. */
  run(frames: number) {
    for (let i = 0; i < frames; i++) {
      const callbacks = [...this.callbacks.values()];
      this.callbacks.clear();
      for (const callback of callbacks) callback(this.time);
      this.time += 50;
    }
  }
}

const success: ExecutionResult = { success: true, outcome: 'success', stdout: '', stderr: '', durationMs: 3, outputTruncated: false };

function setup() {
  const frames = new ManualFrames();
  const playback = new TurtlePlayback(frames);
  let view: PlaybackView = playback.view();
  playback.subscribe((next) => { view = next; });
  playback.setSpeed(1); // 40 steps per second: 2 steps per 50 ms frame
  playback.reset();
  return { frames, playback, view: () => view };
}

describe('TurtlePlayback', () => {
  it('shows console output only when the turtle reaches the matching command', () => {
    const { frames, playback, view } = setup();
    playback.addOutput('stdout', 'start\n', 0);
    playback.addCommands([{ type: 'forward', distance: 4 }], false);
    playback.addOutput('stdout', 'po linii\n', 1);
    expect(view()).toMatchObject({ stdout: 'start\n', animating: true });
    frames.run(2);
    expect(view().stdout).toBe('start\n');
    frames.run(2);
    expect(view()).toMatchObject({ stdout: 'start\npo linii\n', animating: false });
    expect(view().drawing.segments).toHaveLength(1);
  });

  it('delivers the result after the animation and works without Turtle commands', () => {
    const { frames, playback, view } = setup();
    const deliver = vi.fn();
    playback.addCommands([{ type: 'forward', distance: 4 }], false);
    playback.finish(success, deliver);
    expect(deliver).not.toHaveBeenCalled();
    frames.run(4);
    expect(deliver).toHaveBeenCalledExactlyOnceWith(success);
    expect(frames.pending).toBe(0);

    playback.reset();
    playback.addOutput('stdout', 'Hello\n');
    playback.markOutputTruncated();
    const consoleDeliver = vi.fn();
    playback.finish(success, consoleDeliver);
    expect(view()).toMatchObject({ stdout: 'Hello\n', outputTruncated: true, animating: false });
    expect(consoleDeliver).toHaveBeenCalledOnce();
  });

  it('skip shows the finished drawing, output and later commands at once', () => {
    const { frames, playback, view } = setup();
    playback.addCommands([{ type: 'forward', distance: 100 }], false);
    playback.addOutput('stdout', 'koniec\n', 1);
    playback.skip();
    expect(view()).toMatchObject({ stdout: 'koniec\n', animating: false });
    playback.addCommands([{ type: 'left', angle: 90 }, { type: 'forward', distance: 100 }], false);
    expect(view().drawing.state).toMatchObject({ x: 100, y: 100 });
    expect(frames.pending).toBe(0);
  });

  it('stop clears the drawing and turns a waiting result into "stopped"', () => {
    const { frames, playback, view } = setup();
    const deliver = vi.fn();
    playback.addOutput('stdout', 'widoczne\n', 0);
    playback.addCommands([{ type: 'forward', distance: 100 }], false);
    playback.addOutput('stdout', 'ukryte\n', 1);
    playback.finish(success, deliver);
    frames.run(3);
    playback.stop();
    expect(view()).toMatchObject({ stdout: 'widoczne\n', animating: false });
    expect(view().drawing.segments).toEqual([]);
    expect(view().drawing.pending).toBeUndefined();
    expect(deliver).toHaveBeenCalledExactlyOnceWith({ ...success, success: false, outcome: 'stopped' });
    expect(frames.pending).toBe(0);
  });

  it('caps long pauses between frames', () => {
    const { frames, playback, view } = setup();
    playback.addCommands([{ type: 'forward', distance: 100 }], false);
    frames.run(1);
    frames.time += 10_000;
    frames.run(1);
    expect(view().drawing.state.x).toBeLessThanOrEqual(4);
  });
});
