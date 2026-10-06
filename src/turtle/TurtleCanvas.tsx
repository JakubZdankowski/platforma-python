import { useEffect, useRef, useState } from 'react';
import { renderTurtle } from './renderTurtle';
import type { TurtleDrawing } from './turtleTypes';

interface Props {
  drawing: TurtleDrawing;
  label: string;
}

/** Responsive square canvas; the logical 400 × 400 area is scaled to the available width. */
export function TurtleCanvas({ drawing, label }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixelSize, setPixelSize] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setPixelSize(Math.round(frame.clientWidth * window.devicePixelRatio));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context || pixelSize === 0) return;
    // Batches can arrive faster than the screen refreshes; draw at most once per frame.
    const frame = requestAnimationFrame(() => renderTurtle(context, drawing, pixelSize));
    return () => cancelAnimationFrame(frame);
  }, [drawing, pixelSize]);

  return (
    <div ref={frameRef} className="turtle-canvas-frame">
      <canvas
        ref={canvasRef}
        className="turtle-canvas"
        width={pixelSize}
        height={pixelSize}
        role="img"
        aria-label={label}
        data-testid="turtle-canvas"
        data-segments={drawing.segments.length}
      />
    </div>
  );
}
