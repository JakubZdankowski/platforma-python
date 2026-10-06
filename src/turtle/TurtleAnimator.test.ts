import { describe, expect, it } from 'vitest';
import { stepsPerSecond, TurtleAnimator } from './TurtleAnimator';

describe('TurtleAnimator', () => {
  it('speeds up with every slider level', () => {
    expect(stepsPerSecond(1)).toBe(40);
    expect(stepsPerSecond(2)).toBe(60);
    expect(stepsPerSecond(10)).toBeGreaterThan(stepsPerSecond(9));
  });

  it('draws a line gradually and completes commands in order', () => {
    const animator = new TurtleAnimator();
    animator.push([{ type: 'color', color: 'red' }, { type: 'forward', distance: 40 }, { type: 'left', angle: 90 }]);
    animator.advance(500, 1); // 20 steps at speed 1
    expect(animator.completed).toBe(1);
    expect(animator.snapshot().pending).toMatchObject({ x2: 20, color: 'red' });
    expect(animator.snapshot().segments).toHaveLength(0);
    animator.advance(500, 1);
    expect(animator.completed).toBe(2);
    expect(animator.snapshot().segments).toHaveLength(1);
    animator.advance(375, 1); // 15 of 30 steps of turning
    expect(animator.snapshot().state.heading).toBeCloseTo(45);
    animator.advance(1000, 1);
    expect(animator.idle).toBe(true);
    expect(animator.snapshot().state.heading).toBe(90);
  });

  it('keeps its progress when the speed changes and can finish at once', () => {
    const animator = new TurtleAnimator();
    animator.push([{ type: 'forward', distance: 100 }, { type: 'forward', distance: 100 }]);
    animator.advance(1000, 1);
    expect(animator.snapshot().state.x).toBeCloseTo(40);
    animator.advance(1000, 2);
    expect(animator.snapshot().state.x).toBeCloseTo(100);
    animator.finishAll();
    expect(animator.idle).toBe(true);
    expect(animator.snapshot().state.x).toBe(200);
    animator.reset();
    expect(animator.snapshot().segments).toEqual([]);
    expect(animator.completed).toBe(0);
  });
});
