import { useCallback, useEffect, useRef, useState } from 'react';
import { TurtlePlayback } from '../turtle/TurtlePlayback';
import { TURTLE_SPEED_DEFAULT } from '../turtle/turtleTypes';
import { PythonRunner } from './PythonRunner';
import type { ExecutionResult, RunnerStatus } from './protocol';

export function usePythonRunner() {
  const [runner] = useState(() => new PythonRunner());
  // Console output also goes through the playback, so it stays in sync with Turtle drawings.
  const [playback] = useState(() => new TurtlePlayback());
  const [status, setStatus] = useState<RunnerStatus>('idle');
  const [view, setView] = useState(() => playback.view());
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [turtleSpeed, setTurtleSpeedState] = useState(TURTLE_SPEED_DEFAULT);
  const mounted = useRef(false);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const unsubscribePlayback = playback.subscribe(setView);
    const unsubscribe = runner.subscribe((event) => {
      if (event.type === 'status') setStatus(event.status);
      else if (event.type === 'output-truncated') playback.markOutputTruncated(event.turtleIndex);
      else if (event.type === 'turtle') playback.addCommands(event.commands, event.truncated);
      else playback.addOutput(event.stream, event.text, event.turtleIndex);
    });
    return () => { mounted.current = false; unsubscribe(); unsubscribePlayback(); playback.dispose(); runner.dispose(); };
  }, [runner, playback]);

  const clear = useCallback(() => {
    playback.reset();
    setResult(null);
  }, [playback]);

  const run = useCallback(async (code: string, inputUnavailableMessage: string, turtleEnabled = false) => {
    if (busy.current || playback.animating) return;
    busy.current = true;
    clear();
    try {
      const execution = await runner.run(code, { inputUnavailableMessage, turtle: turtleEnabled });
      // The result appears once the turtle has finished drawing everything the program sent.
      if (mounted.current) playback.finish(execution, (final) => { if (mounted.current) setResult(final); });
      return execution;
    } finally {
      busy.current = false;
    }
  }, [runner, playback, clear]);

  /** Stops the program and the animation, and clears the drawing. */
  const stop = useCallback(() => {
    runner.stop();
    playback.stop();
  }, [runner, playback]);

  const skipAnimation = useCallback(() => playback.skip(), [playback]);
  const setTurtleSpeed = useCallback((speed: number) => {
    setTurtleSpeedState(speed);
    playback.setSpeed(speed);
  }, [playback]);

  const runnerBusy = status === 'loading' || status === 'running';
  return {
    run, stop, clear, skipAnimation, setTurtleSpeed, turtleSpeed, status, result,
    output: { stdout: view.stdout, stderr: view.stderr },
    truncated: view.outputTruncated,
    turtle: view.drawing,
    drawing: view.animating,
    isBusy: runnerBusy || view.animating,
  };
}
