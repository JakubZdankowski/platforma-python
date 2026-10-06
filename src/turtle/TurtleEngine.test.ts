import { describe, expect, it } from 'vitest';
import { INITIAL_TURTLE_STATE, TurtleEngine } from './TurtleEngine';
import type { TurtleCommand } from './turtleTypes';

function draw(commands: TurtleCommand[]) {
  const engine = new TurtleEngine();
  engine.applyAll(commands);
  return engine.snapshot();
}

const line = (x1: number, y1: number, x2: number, y2: number, color = 'black', width = 1) =>
  ({ kind: 'line', x1, y1, x2, y2, color, width });

describe('TurtleEngine', () => {
  it('starts in the centre facing east with the pen down', () => {
    expect(new TurtleEngine().snapshot()).toMatchObject({ state: INITIAL_TURTLE_STATE, segments: [], truncated: false });
  });

  it('draws the acceptance square and returns exactly to the start', () => {
    const square: TurtleCommand[] = [];
    for (let i = 0; i < 4; i++) square.push({ type: 'forward', distance: 100 }, { type: 'left', angle: 90 });
    const { state, segments } = draw(square);
    expect(segments).toEqual([line(0, 0, 100, 0), line(100, 0, 100, 100), line(100, 100, 0, 100), line(0, 100, 0, 0)]);
    expect(state).toMatchObject({ x: 0, y: 0, heading: 0 });
  });

  it('moves forward and backward along the heading', () => {
    expect(draw([{ type: 'left', angle: 45 }, { type: 'forward', distance: Math.SQRT2 * 10 }]).state.x).toBeCloseTo(10);
    expect(draw([{ type: 'backward', distance: 30 }]).state).toMatchObject({ x: -30, y: 0, heading: 0 });
  });

  it('turns left and right with normalized headings', () => {
    expect(draw([{ type: 'right', angle: 90 }]).state.heading).toBe(270);
    expect(draw([{ type: 'left', angle: 450 }]).state.heading).toBe(90);
    expect(draw([{ type: 'left', angle: 90 }, { type: 'right', angle: 90 }]).state.heading).toBe(0);
    expect(draw([{ type: 'setheading', angle: -90 }, { type: 'forward', distance: 50 }]).state).toMatchObject({ x: 0, y: -50, heading: 270 });
  });

  it('uses a y-up coordinate system for goto and home', () => {
    const { state, segments } = draw([{ type: 'goto', x: 50, y: -70 }, { type: 'left', angle: 30 }, { type: 'home' }]);
    expect(segments).toEqual([line(0, 0, 50, -70), line(50, -70, 0, 0)]);
    expect(state).toMatchObject({ x: 0, y: 0, heading: 0 });
  });

  it('moves without drawing while the pen is up', () => {
    const { state, segments } = draw([
      { type: 'penup' }, { type: 'goto', x: -100, y: 100 }, { type: 'forward', distance: 20 },
      { type: 'pendown' }, { type: 'forward', distance: 30 },
    ]);
    expect(segments).toEqual([line(-80, 100, -50, 100)]);
    expect(state.penDown).toBe(true);
  });

  it('applies colour and pen size to subsequent lines only', () => {
    const { segments, state } = draw([
      { type: 'forward', distance: 10 }, { type: 'color', color: 'red' }, { type: 'pensize', width: 5 }, { type: 'forward', distance: 10 },
    ]);
    expect(segments).toEqual([line(0, 0, 10, 0), line(10, 0, 20, 0, 'red', 5)]);
    expect(state).toMatchObject({ penColor: 'red', penWidth: 5 });
  });

  it('draws a full circle to the left and returns to the start', () => {
    const { state, segments } = draw([{ type: 'circle', radius: 50, extent: 360 }]);
    expect(segments).toEqual([{ kind: 'arc', cx: 0, cy: 50, radius: 50, startAngle: 270, sweep: 360, color: 'black', width: 1 }]);
    expect(state).toMatchObject({ x: 0, y: 0, heading: 0 });
  });

  it('draws partial and clockwise arcs like standard Turtle', () => {
    const quarter = draw([{ type: 'circle', radius: 100, extent: 90 }]).state;
    expect(quarter.x).toBeCloseTo(100);
    expect(quarter.y).toBeCloseTo(100);
    expect(quarter.heading).toBe(90);
    const clockwise = draw([{ type: 'circle', radius: -100, extent: 90 }]);
    expect(clockwise.segments[0]).toMatchObject({ cx: 0, cy: -100, sweep: -90 });
    expect(clockwise.state.x).toBeCloseTo(100);
    expect(clockwise.state.y).toBeCloseTo(-100);
    expect(clockwise.state.heading).toBe(270);
  });

  it('clears drawings without moving the turtle and toggles visibility', () => {
    const { state, segments } = draw([{ type: 'forward', distance: 40 }, { type: 'clear' }, { type: 'hideturtle' }]);
    expect(segments).toEqual([]);
    expect(state).toMatchObject({ x: 40, visible: false });
    expect(draw([{ type: 'hideturtle' }, { type: 'showturtle' }]).state.visible).toBe(true);
  });

  it('ignores moves that would leave finite coordinates', () => {
    const { state, segments } = draw([{ type: 'forward', distance: Number.MAX_VALUE }, { type: 'forward', distance: Number.MAX_VALUE }]);
    expect(segments).toHaveLength(1);
    expect(Number.isFinite(state.x)).toBe(true);
  });

  it('previews a partly drawn command without changing the state', () => {
    const engine = new TurtleEngine();
    engine.apply({ type: 'forward', distance: 100 });
    const preview = engine.preview({ type: 'goto', x: 100, y: 100 }, 0.25);
    expect(preview.pending).toEqual(line(100, 0, 100, 25));
    expect(preview.state).toMatchObject({ x: 100, y: 25 });
    expect(preview.segments).toHaveLength(1);
    expect(engine.snapshot().state).toMatchObject({ x: 100, y: 0 });
    expect(engine.preview({ type: 'setheading', angle: 270 }, 0.5).state.heading).toBe(315);
    expect(engine.preview({ type: 'circle', radius: 10, extent: 360 }, 0.5).pending).toMatchObject({ sweep: 180 });
    expect(engine.preview({ type: 'color', color: 'red' }, 0.5).pending).toBeUndefined();
  });

  it('measures animation length in steps; turning 3° takes one step', () => {
    const engine = new TurtleEngine();
    expect(engine.cost({ type: 'forward', distance: -40 })).toBe(40);
    expect(engine.cost({ type: 'left', angle: 90 })).toBe(30);
    expect(engine.cost({ type: 'setheading', angle: 270 })).toBe(30);
    expect(engine.cost({ type: 'goto', x: 30, y: 40 })).toBe(50);
    expect(engine.cost({ type: 'circle', radius: 10, extent: 180 })).toBeCloseTo(10 * Math.PI);
    expect(engine.cost({ type: 'penup' })).toBe(0);
  });

  it('is deterministic and resets between runs', () => {
    const commands: TurtleCommand[] = [{ type: 'left', angle: 33 }, { type: 'forward', distance: 77 }, { type: 'circle', radius: 12, extent: 200 }];
    expect(draw(commands)).toEqual(draw(commands));
    const engine = new TurtleEngine();
    engine.applyAll(commands);
    engine.markTruncated();
    const before = engine.snapshot().revision;
    engine.reset();
    expect(engine.snapshot()).toMatchObject({ state: INITIAL_TURTLE_STATE, segments: [], truncated: false });
    expect(engine.snapshot().revision).toBeGreaterThan(before);
  });
});
