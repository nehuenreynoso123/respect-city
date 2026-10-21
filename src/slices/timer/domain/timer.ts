/**
 * Per-mission stopwatch state. The clock is derived from wall time, never
 * from a ticking counter: `elapsedMs` holds the frozen total and
 * `runningSince` marks when the current run segment started, so the time
 * survives a reload.
 */
export interface Stopwatch {
  /** Frozen accumulated time in ms (only changes on pause). */
  elapsedMs: number;
  /** Epoch ms when the current run segment started; null when stopped/paused. */
  runningSince: number | null;
}

/** A stopwatch with no accumulated time and no running segment. */
export const EMPTY_STOPWATCH: Stopwatch = Object.freeze({
  elapsedMs: 0,
  runningSince: null,
});

/** True while the stopwatch has an open run segment. */
export function isRunning(sw: Stopwatch): boolean {
  return sw.runningSince !== null;
}

/** Total time of the stopwatch at `now`, including the running segment. */
export function elapsedOf(sw: Stopwatch, now: number): number {
  const runningSince = sw.runningSince;
  if (runningSince === null) return sw.elapsedMs;
  return sw.elapsedMs + (now - runningSince);
}

/** Opens a run segment; a running stopwatch is left untouched. */
export function startStopwatch(sw: Stopwatch, now: number): Stopwatch {
  if (isRunning(sw)) return sw;
  return { elapsedMs: sw.elapsedMs, runningSince: now };
}

/** Freezes the running segment into `elapsedMs`; a paused stopwatch is untouched. */
export function pauseStopwatch(sw: Stopwatch, now: number): Stopwatch {
  if (!isRunning(sw)) return sw;
  return { elapsedMs: elapsedOf(sw, now), runningSince: null };
}

/** Back to the empty stopwatch. */
export function resetStopwatch(): Stopwatch {
  return EMPTY_STOPWATCH;
}

/** `MM:SS` below one hour, `H:MM:SS` from one hour; never negative. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = pad2(minutes);
  const ss = pad2(seconds);
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Two-digit zero padding for the minute/second parts. */
function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}
