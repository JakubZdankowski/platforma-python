import { TURTLE_LOGICAL_SIZE, type TurtleDrawing, type TurtleSegment, type TurtleState } from './turtleTypes';

const BACKGROUND = '#ffffff';
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function addToPath(context: CanvasRenderingContext2D, segment: TurtleSegment): void {
  if (segment.kind === 'line') {
    context.moveTo(segment.x1, segment.y1);
    context.lineTo(segment.x2, segment.y2);
    return;
  }
  const start = toRadians(segment.startAngle);
  context.moveTo(segment.cx + segment.radius * Math.cos(start), segment.cy + segment.radius * Math.sin(start));
  // The y axis is flipped, so increasing canvas angles are counterclockwise on screen.
  context.arc(segment.cx, segment.cy, segment.radius, start, start + toRadians(segment.sweep), segment.sweep < 0);
}

function drawCursor(context: CanvasRenderingContext2D, state: TurtleState): void {
  context.save();
  context.translate(state.x, state.y);
  context.rotate(toRadians(state.heading));
  context.beginPath();
  context.moveTo(9, 0);
  context.lineTo(-6, 6);
  context.lineTo(-3, 0);
  context.lineTo(-6, -6);
  context.closePath();
  context.fillStyle = state.penColor;
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = state.penColor === 'white' ? '#64748b' : '#ffffff';
  context.stroke();
  context.restore();
}

/** Draws in logical Turtle coordinates: (0, 0) in the centre, y pointing up. */
export function renderTurtle(context: CanvasRenderingContext2D, drawing: TurtleDrawing, pixelSize: number): void {
  const scale = pixelSize / TURTLE_LOGICAL_SIZE;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, pixelSize, pixelSize);
  context.setTransform(scale, 0, 0, -scale, pixelSize / 2, pixelSize / 2);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  // Consecutive segments with the same style share one stroke, which keeps large drawings fast.
  let style = '';
  const draw = (segment: TurtleSegment) => {
    const segmentStyle = `${segment.color} ${segment.width}`;
    if (segmentStyle !== style) {
      context.stroke();
      context.beginPath();
      context.strokeStyle = segment.color;
      context.lineWidth = Math.max(segment.width, 1 / scale);
      style = segmentStyle;
    }
    addToPath(context, segment);
  };
  context.beginPath();
  for (const segment of drawing.segments) draw(segment);
  if (drawing.pending) draw(drawing.pending);
  context.stroke();

  if (drawing.state.visible) drawCursor(context, drawing.state);
}
