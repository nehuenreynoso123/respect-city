import { useCallback, useEffect, useState } from 'react';

import { EMPTY_STOPWATCH, elapsedOf, isRunning } from '../domain/timer';
import { useTimers } from './TimerProvider';

export interface MissionTimer {
  /** Live time of the mission, including the running segment. */
  elapsedMs: number;
  /** True while the mission's stopwatch is running. */
  running: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

/**
 * Stopwatch of a single mission. The hook ticks once per second, but only
 * while that mission's timer runs: a stopped stopwatch never re-renders and
 * only the running one ticks.
 */
export function useMissionTimer(missionId: string): MissionTimer {
  const { timers, play, pause, reset } = useTimers();
  const stopwatch = timers[missionId] ?? EMPTY_STOPWATCH;
  const running = isRunning(stopwatch);

  // The elapsed time is read from the wall clock on every render; the tick
  // counter only forces the re-render that refreshes it.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1_000);
    return () => clearInterval(id);
  }, [running]);

  const playMission = useCallback(() => play(missionId), [play, missionId]);
  const pauseMission = useCallback(() => pause(missionId), [pause, missionId]);
  const resetMission = useCallback(() => reset(missionId), [reset, missionId]);

  return {
    elapsedMs: elapsedOf(stopwatch, Date.now()),
    running,
    play: playMission,
    pause: pauseMission,
    reset: resetMission,
  };
}
