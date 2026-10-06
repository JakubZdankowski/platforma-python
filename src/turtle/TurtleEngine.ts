import type { TurtleCommand, TurtleDrawing, TurtleSegment, TurtleState } from './turtleTypes';

export const INITIAL_TURTLE_STATE: Readonly<TurtleState> = {
  x: 0, y: 0, heading: 0, penDown: true, penColor: 'black', penWidth: 1, visible: true,
};

/** Turning by this many degrees takes as long as walking one step. */
const DEGREES_PER_STEP = 3;

function normalizeAngle(degrees: number): number {
  const angle = degrees % 360;
  return angle < 0 ? angle + 360 : angle + 0; // `+ 0` turns -0 into 0
}

/** Shortest signed turn from one heading to another, in (-180, 180]. */
function turnBetween(from: number, to: number): number {
  const turn = normalizeAngle(to - from);
  return turn > 180 ? turn - 360 : turn;
}

/** Exact values for multiples of 90° keep squares free of floating-point drift. */
function direction(degrees: number): [number, number] {
  const angle = normalizeAngle(degrees);
  if (angle === 0) return [1, 0];
  if (angle === 90) return [0, 1];
  if (angle === 180) return [-1, 0];
  if (angle === 270) return [0, -1];
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians), Math.sin(radians)];
}

/** Deterministic Turtle state machine. It knows nothing about Python, time or the canvas. */
export class TurtleEngine {
  private state: TurtleState = { ...INITIAL_TURTLE_STATE };
  private segments: TurtleSegment[] = [];
  private revision = 0;
  private truncated = false;

  reset(): void {
    this.state = { ...INITIAL_TURTLE_STATE };
    this.segments = [];
    this.truncated = false;
    this.revision++;
  }

  markTruncated(): void {
    if (this.truncated) return;
    this.truncated = true;
    this.revision++;
  }

  applyAll(commands: readonly TurtleCommand[]): void {
    for (const command of commands) this.apply(command);
  }

  apply(command: TurtleCommand): void {
    if (command.type === 'clear') this.segments = [];
    const segment = this.step(command);
    if (segment) this.segments.push(segment);
    this.revision++;
  }

  snapshot(): TurtleDrawing {
    return { state: { ...this.state }, segments: this.segments, revision: this.revision, truncated: this.truncated };
  }

  /** How long a command takes to animate, in steps. Pen and visibility changes are instant. */
  cost(command: TurtleCommand): number {
    const { state } = this;
    switch (command.type) {
      case 'forward':
      case 'backward': return Math.abs(command.distance);
      case 'left':
      case 'right': return Math.abs(command.angle) / DEGREES_PER_STEP;
      case 'setheading': return Math.abs(turnBetween(state.heading, command.angle)) / DEGREES_PER_STEP;
      case 'goto': return Math.hypot(command.x - state.x, command.y - state.y);
      case 'home': return Math.hypot(state.x, state.y);
      case 'circle': return (Math.abs(command.radius * command.extent) * Math.PI) / 180;
      default: return 0;
    }
  }

  /** The drawing as it looks `fraction` of the way through `command`, without changing the engine. */
  preview(command: TurtleCommand, fraction: number): TurtleDrawing {
    const partial = this.partial(command, fraction);
    if (!partial) return this.snapshot();
    const saved = this.state;
    this.state = { ...saved };
    const pending = this.step(partial);
    const preview: TurtleDrawing = { ...this.snapshot(), pending };
    this.state = saved;
    return preview;
  }

  private partial(command: TurtleCommand, fraction: number): TurtleCommand | null {
    const { state } = this;
    switch (command.type) {
      case 'forward':
      case 'backward': return { type: command.type, distance: command.distance * fraction };
      case 'left':
      case 'right': return { type: command.type, angle: command.angle * fraction };
      case 'setheading': return { type: 'left', angle: turnBetween(state.heading, command.angle) * fraction };
      case 'goto': return { type: 'goto', x: state.x + (command.x - state.x) * fraction, y: state.y + (command.y - state.y) * fraction };
      case 'home': return { type: 'goto', x: state.x * (1 - fraction), y: state.y * (1 - fraction) };
      case 'circle': return { type: 'circle', radius: command.radius, extent: command.extent * fraction };
      default: return null;
    }
  }

  /** Updates the state and returns the segment drawn by this command, if any. */
  private step(command: TurtleCommand): TurtleSegment | undefined {
    const state = this.state;
    switch (command.type) {
      case 'forward': return this.move(command.distance);
      case 'backward': return this.move(-command.distance);
      case 'left': state.heading = normalizeAngle(state.heading + command.angle); return undefined;
      case 'right': state.heading = normalizeAngle(state.heading - command.angle); return undefined;
      case 'setheading': state.heading = normalizeAngle(command.angle); return undefined;
      case 'goto': return this.moveTo(command.x, command.y);
      case 'home': {
        const segment = this.moveTo(0, 0);
        state.heading = 0;
        return segment;
      }
      case 'circle': return this.circle(command.radius, command.extent);
      case 'color': state.penColor = command.color; return undefined;
      case 'pensize': state.penWidth = command.width; return undefined;
      case 'penup': state.penDown = false; return undefined;
      case 'pendown': state.penDown = true; return undefined;
      case 'hideturtle': state.visible = false; return undefined;
      case 'showturtle': state.visible = true; return undefined;
      case 'clear': return undefined;
    }
  }

  private move(distance: number): TurtleSegment | undefined {
    const [dx, dy] = direction(this.state.heading);
    return this.moveTo(this.state.x + dx * distance, this.state.y + dy * distance);
  }

  private moveTo(x: number, y: number): TurtleSegment | undefined {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    const { state } = this;
    const segment: TurtleSegment | undefined = state.penDown && (x !== state.x || y !== state.y)
      ? { kind: 'line', x1: state.x, y1: state.y, x2: x, y2: y, color: state.penColor, width: state.penWidth }
      : undefined;
    state.x = x;
    state.y = y;
    return segment;
  }

  /** Like standard Turtle: the centre is `radius` units to the left; negative radius goes clockwise. */
  private circle(radius: number, extent: number): TurtleSegment | undefined {
    const { state } = this;
    const sweep = extent * Math.sign(radius);
    const [nx, ny] = direction(state.heading + 90);
    const cx = state.x + nx * radius;
    const cy = state.y + ny * radius;
    const startAngle = normalizeAngle(state.heading + (radius > 0 ? -90 : 90));
    const [ex, ey] = direction(startAngle + sweep);
    const x = cx + ex * Math.abs(radius);
    const y = cy + ey * Math.abs(radius);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    const segment: TurtleSegment | undefined = state.penDown && radius !== 0 && sweep !== 0
      ? { kind: 'arc', cx, cy, radius: Math.abs(radius), startAngle, sweep, color: state.penColor, width: state.penWidth }
      : undefined;
    // A full circle returns exactly to its starting point.
    if (Math.abs(sweep) % 360 !== 0) {
      state.x = x;
      state.y = y;
    }
    state.heading = normalizeAngle(state.heading + sweep);
    return segment;
  }
}
