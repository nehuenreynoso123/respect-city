import {
  EMPTY_STOPWATCH,
  elapsedOf,
  isRunning,
  pauseStopwatch,
  startStopwatch,
} from '../domain/timer';
import type { Stopwatch } from '../domain/timer';

/** Stopwatch of every mission with tracked time, keyed by mission id. */
export type TimerMap = Record<string, Stopwatch>;

/** No mission has tracked time yet. */
export const EMPTY_TIMERS: TimerMap = {};

/**
 * Starts the timer of `missionId` and pauses every other running timer:
 * only one stopwatch runs at a time.
 */
export function playTimer(timers: TimerMap, missionId: string, now: number): TimerMap {
  const next: TimerMap = {};
  for (const [id, sw] of Object.entries(timers)) {
    if (id === missionId) continue;
    next[id] = pauseStopwatch(sw, now);
  }
  next[missionId] = startStopwatch(timerOf(timers, missionId), now);
  return next;
}

/** Freezes the running segment of `missionId`. */
export function pauseTimer(timers: TimerMap, missionId: string, now: number): TimerMap {
  const current = timers[missionId];
  if (!current) return { ...timers };
  return { ...timers, [missionId]: pauseStopwatch(current, now) };
}

/** Drops the timer of `missionId` entirely. */
export function resetTimer(timers: TimerMap, missionId: string): TimerMap {
  if (!(missionId in timers)) return { ...timers };
  const next: TimerMap = { ...timers };
  delete next[missionId];
  return next;
}

/** Mission whose timer is currently running, if any. */
export function runningMissionId(timers: TimerMap): string | null {
  for (const [id, sw] of Object.entries(timers)) {
    if (isRunning(sw)) return id;
  }
  return null;
}

/** Time accumulated by `missionId`, including the running segment. */
export function totalElapsedOf(timers: TimerMap, missionId: string, now: number): number {
  return elapsedOf(timerOf(timers, missionId), now);
}

/** Timer of a mission, or the empty stopwatch when it has none. */
function timerOf(timers: TimerMap, missionId: string): Stopwatch {
  return timers[missionId] ?? EMPTY_STOPWATCH;
}
