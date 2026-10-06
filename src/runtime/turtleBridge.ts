import type { TurtleCommand } from '../turtle/turtleTypes';

export { default as turtleSource } from './turtle.py?raw';

type Fields = Record<string, unknown>;

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const hasNumbers = (fields: Fields, ...names: string[]) => names.every((name) => isNumber(fields[name]));

/** Rebuilds commands field by field: anything the Python program emits is untrusted. */
function toCommand(fields: Fields): TurtleCommand | null {
  switch (fields.type) {
    case 'forward':
    case 'backward':
      return hasNumbers(fields, 'distance') ? { type: fields.type, distance: fields.distance as number } : null;
    case 'left':
    case 'right':
    case 'setheading':
      return hasNumbers(fields, 'angle') ? { type: fields.type, angle: fields.angle as number } : null;
    case 'goto':
      return hasNumbers(fields, 'x', 'y') ? { type: 'goto', x: fields.x as number, y: fields.y as number } : null;
    case 'circle':
      return hasNumbers(fields, 'radius', 'extent') ? { type: 'circle', radius: fields.radius as number, extent: fields.extent as number } : null;
    case 'pensize':
      return hasNumbers(fields, 'width') && (fields.width as number) >= 0 ? { type: 'pensize', width: fields.width as number } : null;
    case 'color':
      return typeof fields.color === 'string' && /^(?:[a-z]{3,20}|#[0-9a-f]{3}|#[0-9a-f]{6})$/.test(fields.color)
        ? { type: 'color', color: fields.color } : null;
    case 'penup':
    case 'pendown':
    case 'home':
    case 'clear':
    case 'hideturtle':
    case 'showturtle':
      return { type: fields.type };
    default:
      return null;
  }
}

/** Parses one message sent by turtle.py: a command, the truncation notice, or null when invalid. */
export function parseTurtleMessage(json: string): TurtleCommand | 'truncated' | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const fields = data as Fields;
  return fields.type === 'truncated' ? 'truncated' : toCommand(fields);
}

/** Groups commands into messages: every 500 commands or ~40 ms, like console output. */
export class TurtleBatcher {
  private pending: TurtleCommand[] = [];
  private truncated = false;
  private truncationSent = false;
  private lastFlush: number;

  constructor(
    private readonly emit: (commands: TurtleCommand[], truncated: boolean) => void,
    private readonly now = () => performance.now(),
  ) {
    this.lastFlush = now();
  }

  add(command: TurtleCommand): void {
    this.pending.push(command);
    if (this.pending.length >= 500 || this.now() - this.lastFlush >= 40) this.flush();
  }

  markTruncated(): void {
    this.truncated = true;
    this.flush();
  }

  flush(): void {
    this.lastFlush = this.now();
    const sendTruncation = this.truncated && !this.truncationSent;
    if (this.pending.length === 0 && !sendTruncation) return;
    this.truncationSent ||= sendTruncation;
    const commands = this.pending;
    this.pending = [];
    this.emit(commands, this.truncated);
  }
}
