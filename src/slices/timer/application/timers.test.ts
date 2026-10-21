import { describe, expect, it } from 'vitest';

import {
  EMPTY_TIMERS,
  pauseTimer,
  playTimer,
  resetTimer,
  runningMissionId,
  totalElapsedOf,
} from './timers';

describe('playTimer', () => {
  it('pauses the previously running mission and starts the new one', () => {
    const timers = { a: { elapsedMs: 0, runningSince: 1_000 } };
    const next = playTimer(timers, 'b', 5_000);
    expect(next.a).toEqual({ elapsedMs: 4_000, runningSince: null });
    expect(next.b).toEqual({ elapsedMs: 0, runningSince: 5_000 });
  });

  it('keeps the already accumulated time of the paused mission', () => {
    const timers = { a: { elapsedMs: 2_000, runningSince: 1_000 } };
    const next = playTimer(timers, 'b', 5_000);
    expect(next.a.elapsedMs).toBe(6_000);
  });

  it('does not restart a timer that is already running', () => {
    const timers = { a: { elapsedMs: 0, runningSince: 1_000 } };
    const next = playTimer(timers, 'a', 5_000);
    expect(next.a.runningSince).toBe(1_000);
  });

  it('never mutates the input map', () => {
    const timers = { a: { elapsedMs: 0, runningSince: 1_000 } };
    playTimer(timers, 'b', 5_000);
    expect(timers).toEqual({ a: { elapsedMs: 0, runningSince: 1_000 } });
  });
});

describe('pauseTimer', () => {
  it('freezes the running segment', () => {
    const timers = { a: { elapsedMs: 0, runningSince: 1_000 } };
    const next = pauseTimer(timers, 'a', 5_000);
    expect(next.a).toEqual({ elapsedMs: 4_000, runningSince: null });
  });

  it('keeps the map untouched for a mission without timer', () => {
    const next = pauseTimer(EMPTY_TIMERS, 'a', 5_000);
    expect(next).toEqual(EMPTY_TIMERS);
  });

  it('never mutates the input map', () => {
    const timers = { a: { elapsedMs: 0, runningSince: 1_000 } };
    pauseTimer(timers, 'a', 5_000);
    expect(timers).toEqual({ a: { elapsedMs: 0, runningSince: 1_000 } });
  });
});

describe('resetTimer', () => {
  it('removes the entry of the mission', () => {
    const timers = { a: { elapsedMs: 0, runningSince: 1_000 }, b: { elapsedMs: 5, runningSince: null } };
    const next = resetTimer(timers, 'a');
    expect(next).toEqual({ b: { elapsedMs: 5, runningSince: null } });
  });

  it('never mutates the input map', () => {
    const timers = { a: { elapsedMs: 0, runningSince: 1_000 } };
    resetTimer(timers, 'a');
    expect(timers).toEqual({ a: { elapsedMs: 0, runningSince: 1_000 } });
  });
});

describe('runningMissionId', () => {
  it('returns the mission whose timer runs', () => {
    const timers = { a: { elapsedMs: 0, runningSince: 1_000 }, b: { elapsedMs: 0, runningSince: null } };
    expect(runningMissionId(timers)).toBe('a');
  });

  it('returns null when nothing runs', () => {
    expect(runningMissionId(EMPTY_TIMERS)).toBeNull();
  });
});

describe('totalElapsedOf', () => {
  it('includes the running segment', () => {
    const timers = { a: { elapsedMs: 1_000, runningSince: 2_000 } };
    expect(totalElapsedOf(timers, 'a', 5_000)).toBe(4_000);
  });

  it('returns zero for a mission without timer', () => {
    expect(totalElapsedOf(EMPTY_TIMERS, 'a', 5_000)).toBe(0);
  });
});
