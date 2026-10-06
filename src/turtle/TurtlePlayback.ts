import type { ExecutionResult, OutputStream } from '../runtime/protocol';
import { TurtleAnimator } from './TurtleAnimator';
import { TURTLE_SPEED_DEFAULT, type TurtleCommand, type TurtleDrawing } from './turtleTypes';

export interface PlaybackView {
  drawing: TurtleDrawing;
  stdout: string;
  stderr: string;
  outputTruncated: boolean;
  /** The turtle still has commands to draw. */
  animating: boolean;
}

export interface FrameScheduler {
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
}

const browserFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/** A long pause (e.g. a hidden tab) must not make the turtle jump far ahead. */
const MAX_FRAME_MS = 100;

type OutputEntry =
  | { index: number; kind: 'text'; stream: OutputStream; text: string }
  | { index: number; kind: 'truncated' };

/**
 * Replays one run in sync: console output written after the n-th Turtle command
 * is shown only once the turtle has finished drawing that command.
 * The program result is delivered when everything has been shown.
 */
export class TurtlePlayback {
  private readonly animator = new TurtleAnimator();
  private readonly listeners = new Set<(view: PlaybackView) => void>();
  private outputs: OutputEntry[] = [];
  private nextOutput = 0;
  private stdout = '';
  private stderr = '';
  private outputTruncated = false;
  private speed = TURTLE_SPEED_DEFAULT;
  private instant = false;
  private frame?: number;
  private lastTime?: number;
  private pendingResult?: { result: ExecutionResult; deliver: (result: ExecutionResult) => void };

  constructor(private readonly frames: FrameScheduler = browserFrames) {}

  subscribe(listener: (view: PlaybackView) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get animating(): boolean {
    return !this.animator.idle;
  }

  view(): PlaybackView {
    return {
      drawing: this.animator.snapshot(),
      stdout: this.stdout,
      stderr: this.stderr,
      outputTruncated: this.outputTruncated,
      animating: this.animating,
    };
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /** Clears everything for a new run or another exercise. */
  reset(): void {
    this.cancelFrame();
    this.animator.reset();
    this.outputs = [];
    this.nextOutput = 0;
    this.stdout = '';
    this.stderr = '';
    this.outputTruncated = false;
    this.instant = false;
    this.pendingResult = undefined;
    this.emit();
  }

  addCommands(commands: readonly TurtleCommand[], truncated: boolean): void {
    this.animator.push(commands);
    if (truncated) this.animator.markTruncated();
    this.update();
  }

  addOutput(stream: OutputStream, text: string, turtleIndex = 0): void {
    this.outputs.push({ index: turtleIndex, kind: 'text', stream, text });
    this.update();
  }

  markOutputTruncated(turtleIndex = 0): void {
    this.outputs.push({ index: turtleIndex, kind: 'truncated' });
    this.update();
  }

  /** The program has ended; `deliver` runs once the turtle has caught up. */
  finish(result: ExecutionResult, deliver: (result: ExecutionResult) => void): void {
    this.pendingResult = { result, deliver };
    this.update();
  }

  /** Shows the finished drawing now, including commands that arrive later in this run. */
  skip(): void {
    this.instant = true;
    this.update();
  }

  /** Stop: clears the drawing; a result still waiting for the animation becomes "stopped". */
  stop(): void {
    this.cancelFrame();
    this.animator.reset();
    this.outputs = [];
    this.nextOutput = 0;
    const pending = this.pendingResult;
    this.pendingResult = undefined;
    this.emit();
    pending?.deliver({ ...pending.result, success: false, outcome: 'stopped' });
  }

  dispose(): void {
    this.cancelFrame();
    this.listeners.clear();
  }

  private update(): void {
    if (this.instant) this.animator.finishAll();
    this.revealOutput();
    this.emit();
    if (this.animator.idle) {
      this.cancelFrame();
      this.settle();
    } else {
      this.scheduleFrame();
    }
  }

  private readonly tick = (time: number): void => {
    this.frame = undefined;
    const elapsed = this.lastTime === undefined ? 0 : Math.min(time - this.lastTime, MAX_FRAME_MS);
    this.lastTime = time;
    this.animator.advance(elapsed, this.speed);
    this.update();
  };

  private revealOutput(): void {
    const limit = this.pendingResult && this.animator.idle ? Infinity : this.animator.completed;
    while (this.nextOutput < this.outputs.length && this.outputs[this.nextOutput]!.index <= limit) {
      const entry = this.outputs[this.nextOutput++]!;
      if (entry.kind === 'truncated') this.outputTruncated = true;
      else this[entry.stream] += entry.text;
    }
  }

  private settle(): void {
    const pending = this.pendingResult;
    if (!pending) return;
    this.pendingResult = undefined;
    pending.deliver(pending.result);
  }

  private scheduleFrame(): void {
    if (this.frame === undefined) this.frame = this.frames.request(this.tick);
  }

  private cancelFrame(): void {
    if (this.frame !== undefined) this.frames.cancel(this.frame);
    this.frame = undefined;
    this.lastTime = undefined;
  }

  private emit(): void {
    if (this.listeners.size === 0) return;
    const view = this.view();
    for (const listener of this.listeners) listener(view);
  }
}
