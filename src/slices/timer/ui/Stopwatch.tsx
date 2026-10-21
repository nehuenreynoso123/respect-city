import { useMissionTimer } from '../application/useMissionTimer';
import { formatElapsed } from '../domain/timer';

export interface StopwatchProps {
  missionId: string;
}

/**
 * Stopwatch control of one mission: the formatted time plus the play/pause
 * toggle and the reset button. The ticking time is not announced to screen
 * readers on purpose — it would flood them with one update per second.
 */
export function Stopwatch({ missionId }: StopwatchProps) {
  const { elapsedMs, running, play, pause, reset } = useMissionTimer(missionId);

  return (
    <div className="stopwatch">
      <div className="sw-label">Time</div>
      <div className="sw-time">{formatElapsed(elapsedMs)}</div>
      <div className="sw-actions">
        <button
          type="button"
          className="btn btn-gold"
          title={running ? 'Pause' : 'Play'}
          aria-label={running ? 'Pause the stopwatch' : 'Play the stopwatch'}
          onClick={running ? pause : play}
        >
          {running ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="btn btn-pink"
          title="Reset"
          aria-label="Reset the stopwatch"
          onClick={reset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
