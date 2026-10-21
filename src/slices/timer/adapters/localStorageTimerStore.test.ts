import { afterEach, describe, expect, it, vi } from 'vitest';

import { TIMER_STORAGE_PREFIX, loadTimers, saveTimers } from './localStorageTimerStore';

describe('localStorageTimerStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('namespaces the storage key per scope', () => {
    expect(TIMER_STORAGE_PREFIX).toBe('rc-timers:v1');
  });

  it('returns an empty map when there is no stored entry', () => {
    expect(loadTimers('missing-scope')).toEqual({});
  });

  it('does not throw when saving without storage', () => {
    expect(() =>
      saveTimers('scope-x', { m1: { elapsedMs: 1_000, runningSince: null } }),
    ).not.toThrow();
  });

  it('returns an empty map when storage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadTimers('scope')).toEqual({});
    expect(() => saveTimers('scope', { m1: { elapsedMs: 1_000, runningSince: null } })).not.toThrow();
  });

  it('survives a storage that throws (private mode)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    expect(loadTimers('scope')).toEqual({});
    expect(() => saveTimers('scope', { m1: { elapsedMs: 1_000, runningSince: null } })).not.toThrow();
  });

  it('ignores malformed entries', () => {
    vi.stubGlobal('localStorage', {
      getItem: () =>
        JSON.stringify({
          good: { elapsedMs: 5_000, runningSince: null },
          bad: { elapsedMs: 'nope' },
          broken: { runningSince: null },
        }),
      setItem: () => {},
    });
    expect(loadTimers('scope')).toEqual({ good: { elapsedMs: 5_000, runningSince: null } });
  });

  it('returns an empty map for corrupt json', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{not json', setItem: () => {} });
    expect(loadTimers('scope')).toEqual({});
  });
});
