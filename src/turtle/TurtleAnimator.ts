import { TurtleEngine } from './TurtleEngine';
import type { TurtleCommand, TurtleDrawing } from './turtleTypes';

/** Speed 1 walks 40 steps per second; every level is 1.5× faster (speed 10 ≈ 1540 steps/s). */
export function stepsPerSecond(speed: number): number {
  return 40 * 1.5 ** (speed - 1);
}

/** Plays queued commands over time. Time is passed in, so the animation is deterministic. */
export class TurtleAnimator {
  private readonly engine = new TurtleEngine();
  private queue: TurtleCommand[] = [];
  private applied = 0;
  /** Progress through the current command, 0–1. */
  private fraction = 0;

  /** Number of commands fully drawn. */
  get completed(): number { return this.applied; }
  get idle(): boolean { return this.applied >= this.queue.length; }

  reset(): void {
    this.engine.reset();
    this.queue = [];
    this.applied = 0;
    this.fraction = 0;
  }

  push(commands: readonly TurtleCommand[]): void {
    for (const command of commands) this.queue.push(command);
  }

  markTruncated(): void {
    this.engine.markTruncated();
  }

  finishAll(): void {
    while (this.applied < this.queue.length) this.engine.apply(this.queue[this.applied++]!);
    this.fraction = 0;
  }

  advance(milliseconds: number, speed: number): void {
    let budget = (milliseconds / 1000) * stepsPerSecond(speed);
    while (this.applied < this.queue.length) {
      const command = this.queue[this.applied]!;
      const cost = this.engine.cost(command);
      const remaining = (1 - this.fraction) * cost;
      if (budget < remaining) {
        this.fraction += budget / cost;
        return;
      }
      budget -= remaining;
      this.engine.apply(command);
      this.applied++;
      this.fraction = 0;
    }
  }

  snapshot(): TurtleDrawing {
    const current = this.queue[this.applied];
    return current && this.fraction > 0 ? this.engine.preview(current, this.fraction) : this.engine.snapshot();
  }
}
