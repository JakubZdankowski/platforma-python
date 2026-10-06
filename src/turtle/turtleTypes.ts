/** Logical drawing area used by the course materials: x and y range from -200 to 200. */
export const TURTLE_LOGICAL_SIZE = 400;
export const MAX_TURTLE_COMMANDS = 50_000;

export const TURTLE_SPEED_MIN = 1;
export const TURTLE_SPEED_MAX = 10;
export const TURTLE_SPEED_DEFAULT = 5;

export type TurtleCommand =
  | { type: 'forward'; distance: number }
  | { type: 'backward'; distance: number }
  | { type: 'left'; angle: number }
  | { type: 'right'; angle: number }
  | { type: 'goto'; x: number; y: number }
  | { type: 'setheading'; angle: number }
  | { type: 'circle'; radius: number; extent: number }
  | { type: 'color'; color: string }
  | { type: 'pensize'; width: number }
  | { type: 'penup' }
  | { type: 'pendown' }
  | { type: 'home' }
  | { type: 'clear' }
  | { type: 'hideturtle' }
  | { type: 'showturtle' };

export interface TurtleState {
  x: number;
  y: number;
  /** Degrees, standard mode: 0 = east, counterclockwise positive. */
  heading: number;
  penDown: boolean;
  penColor: string;
  penWidth: number;
  visible: boolean;
}

interface SegmentStyle {
  color: string;
  width: number;
}

export type TurtleSegment =
  | ({ kind: 'line'; x1: number; y1: number; x2: number; y2: number } & SegmentStyle)
  /** Angles in degrees, counterclockwise; a negative sweep is clockwise. */
  | ({ kind: 'arc'; cx: number; cy: number; radius: number; startAngle: number; sweep: number } & SegmentStyle);

export interface TurtleDrawing {
  state: TurtleState;
  /** Shared, append-only between snapshots; `revision` changes whenever it changes. */
  segments: readonly TurtleSegment[];
  revision: number;
  truncated: boolean;
  /** Part of the line or arc the turtle is drawing right now during an animation. */
  pending?: TurtleSegment;
}
