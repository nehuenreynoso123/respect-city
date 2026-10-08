import { describe, expect, it } from 'vitest';

import type { Mission } from '../domain/types';
import {
  STORAGE_KEY,
  parsePersistedState,
  serializePersistedState,
} from './persistence';
import type { PersistedState } from './state';

const grantedMission: Mission = {
  id: 'm1',
  title: 'Morning Workout',
  category: 'gym',
  x: 640,
  y: 640,
  respect: 150,
  items: [{ id: 'i1', text: 'Run 20 minutes', done: true }],
  rewardGranted: true,
};

const sampleState: PersistedState = {
  player: { exp: 750, stamina: 40, intel: 24, coins: 33 },
  missions: [grantedMission],
  sound: false,
  routineSeeded: 1,
};

describe('legacy `vice-tasks:v1` persistence', () => {
  it('keeps the legacy storage key', () => {
    expect(STORAGE_KEY).toBe('vice-tasks:v1');
  });

  it('serializes exactly the fields vanilla save() wrote, in order', () => {
    const json = serializePersistedState(sampleState);
    expect(Object.keys(JSON.parse(json))).toEqual([
      'player',
      'missions',
      'sound',
      'routineSeeded',
    ]);
    expect(JSON.parse(json)).toEqual(sampleState);
  });

  it('parses a blob produced by vanilla save() without loss', () => {
    // Byte-for-byte what legacy JSON.stringify(state) produced (index.html:829)
    const legacyBlob =
      '{"player":{"exp":750,"stamina":40,"intel":24,"coins":33},' +
      '"missions":[{"id":"m1","title":"Morning Workout","category":"gym",' +
      '"x":640,"y":640,"respect":150,"items":[{"id":"i1",' +
      '"text":"Run 20 minutes","done":true}],"rewardGranted":true}],' +
      '"sound":false,"routineSeeded":1}';
    expect(parsePersistedState(legacyBlob)).toEqual(sampleState);
  });

  it('an older save gains defaults for missing fields', () => {
    const parsed = parsePersistedState('{"player":{"exp":50},"missions":[]}');
    expect(parsed).toEqual({
      player: { exp: 50, stamina: 0, intel: 0, coins: 0 },
      missions: [],
      sound: true,
      routineSeeded: 0,
    });
  });

  it('non-array missions fall back to an empty list', () => {
    expect(parsePersistedState('{"missions":"nope"}')?.missions).toEqual([]);
  });

  it('corrupt or null payloads return null so the caller seeds fresh', () => {
    expect(parsePersistedState('not json')).toBeNull();
    expect(parsePersistedState('null')).toBeNull();
    expect(parsePersistedState('')).toBeNull();
  });
});
