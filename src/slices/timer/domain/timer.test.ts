import { describe, expect, it } from 'vitest';

import {
  EMPTY_STOPWATCH,
  elapsedOf,
  formatElapsed,
  isRunning,
  pauseStopwatch,
  resetStopwatch,
  startStopwatch,
} from './timer';

describe('formatElapsed', () => {
  it('formats zero as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('formats seconds as MM:SS', () => {
    expect(formatElapsed(61_000)).toBe('01:01');
  });

  it('formats hours as H:MM:SS', () => {
    expect(formatElapsed(3_600_000)).toBe('1:00:00');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
  });

  it('never formats negative time', () => {
    expect(formatElapsed(-5_000)).toBe('00:00');
  });
});

describe('elapsedOf', () => {
  it('returns the frozen time while paused', () => {
    const paused = { elapsedMs: 1_000, runningSince: null };
    expect(elapsedOf(paused, 10_000)).toBe(1_000);
  });

  it('adds the running segment', () => {
    const running = { elapsedMs: 1_000, runningSince: 1_000 };
    expect(elapsedOf(running, 4_500)).toBe(4_500);
  });
});

describe('startStopwatch', () => {
  it('opens a run segment on a stopped stopwatch', () => {
    const started = startStopwatch(EMPTY_STOPWATCH, 1_000);
    expect(started.runningSince).toBe(1_000);
    expect(started.elapsedMs).toBe(0);
    expect(isRunning(started)).toBe(true);
  });

  it('is a no-op when already running', () => {
    const running = startStopwatch(EMPTY_STOPWATCH, 1_000);
    expect(startStopwatch(running, 5_000)).toBe(running);
  });
});

describe('pauseStopwatch', () => {
  it('freezes the elapsed time', () => {
    const running = { elapsedMs: 2_000, runningSince: 1_000 };
    const paused = pauseStopwatch(running, 5_000);
    expect(paused.elapsedMs).toBe(6_000);
    expect(paused.runningSince).toBeNull();
    expect(isRunning(paused)).toBe(false);
  });

  it('is a no-op when not running', () => {
    const paused = { elapsedMs: 2_000, runningSince: null };
    expect(pauseStopwatch(paused, 5_000)).toBe(paused);
  });
});

describe('resetStopwatch', () => {
  it('goes back to the empty stopwatch', () => {
    expect(resetStopwatch()).toEqual(EMPTY_STOPWATCH);
  });
});
