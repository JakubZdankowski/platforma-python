import type { Messages } from '../i18n/en';
import { TurtleCanvas } from './TurtleCanvas';
import { TURTLE_SPEED_MAX, TURTLE_SPEED_MIN, type TurtleDrawing } from './turtleTypes';

interface Props {
  messages: Messages;
  drawing: TurtleDrawing;
  speed: number;
  onSpeedChange: (speed: number) => void;
  canSkip: boolean;
  onSkip: () => void;
}

export function TurtlePanel({ messages: t, drawing, speed, onSpeedChange, canSkip, onSkip }: Props) {
  return (
    <section className="turtle-panel" aria-labelledby="turtle-title">
      <div className="panel-heading">
        <h2 id="turtle-title">{t.turtleTitle}</h2>
      </div>
      <div className="turtle-controls">
        <label className="turtle-speed">
          <span>{t.turtleSpeed}</span>
          <input
            type="range"
            min={TURTLE_SPEED_MIN}
            max={TURTLE_SPEED_MAX}
            step={1}
            value={speed}
            aria-valuetext={`${speed} / ${TURTLE_SPEED_MAX}`}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          />
        </label>
        <button type="button" className="turtle-skip" disabled={!canSkip} onClick={onSkip}>{t.skipAnimation}</button>
      </div>
      <div className="turtle-stage">
        <div className="turtle-viewport">
          <TurtleCanvas drawing={drawing} label={t.turtleCanvasLabel} />
        </div>
        {drawing.truncated && <p className="output-notice">{t.turtleTruncated}</p>}
      </div>
    </section>
  );
}
