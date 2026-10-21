import { EMPTY_TIMERS } from '../application/timers';
import type { TimerMap } from '../application/timers';
import type { Stopwatch } from '../domain/timer';

/** localStorage key prefix; the scope (user id) is appended to it. */
export const TIMER_STORAGE_PREFIX = 'rc-timers:v1';

/**
 * Reads the persisted timers of a scope. A missing, unreadable or malformed
 * entry yields an empty map: the stopwatch simply starts from zero.
 */
export function loadTimers(scope: string): TimerMap {
  const store = storage();
  if (!store) return EMPTY_TIMERS;

  let raw: string | null;
  try {
    raw = store.getItem(storageKey(scope));
  } catch {
    return EMPTY_TIMERS;
  }
  if (!raw) return EMPTY_TIMERS;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return EMPTY_TIMERS;
    }
    const timers: TimerMap = {};
    for (const [missionId, value] of Object.entries(parsed as Record<string, unknown>)) {
      const stopwatch = toStopwatch(value);
      if (stopwatch) timers[missionId] = stopwatch;
    }
    return timers;
  } catch {
    return EMPTY_TIMERS;
  }
}

/** Persists the timers of a scope; storage failures are ignored. */
export function saveTimers(scope: string, timers: TimerMap): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(storageKey(scope), JSON.stringify(timers));
  } catch {
    // Private mode or quota exceeded: the stopwatch keeps working in memory.
  }
}

/** Storage key of a scope. */
function storageKey(scope: string): string {
  return `${TIMER_STORAGE_PREFIX}:${scope}`;
}

/**
 * localStorage is missing outside the browser (node/tests) and may throw on
 * access in private mode, so every lookup is guarded.
 */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Accepts only well-formed stopwatch objects; anything else is dropped. */
function toStopwatch(value: unknown): Stopwatch | null {
  if (typeof value !== 'object' || value === null) return null;
  const { elapsedMs, runningSince } = value as {
    elapsedMs?: unknown;
    runningSince?: unknown;
  };
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs)) return null;
  if (runningSince !== null && (typeof runningSince !== 'number' || !Number.isFinite(runningSince))) {
    return null;
  }
  return { elapsedMs: Math.max(0, elapsedMs), runningSince };
}
