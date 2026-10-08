import { describe, expect, it } from 'vitest';

import type { StoragePort } from '@/slices/storage/ports/StoragePort';
import { emptyPlayer } from '@/slices/player/domain/player';

import { LocalStorageMissionRepository } from '../adapters/LocalStorageMissionRepository';
import { ROUTINE_MISSIONS, ROUTINE_VERSION } from '../routine';
import { STORAGE_KEY } from './persistence';
import { loadInitialState } from './load';

class FakeStorage implements StoragePort {
  readonly map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function setup() {
  const fake = new FakeStorage();
  return { fake, repo: new LocalStorageMissionRepository(fake) };
}

describe('loadInitialState (legacy load flow)', () => {
  it('first visit: 3 demo missions + 5 routine blocks, persisted', () => {
    const { fake, repo } = setup();
    const state = loadInitialState(repo);

    expect(state.missions.map(m => m.title)).toEqual([
      'Morning Workout',
      'Ship Login Feature',
      'Drink 2L of Water',
      ...ROUTINE_MISSIONS.map(t => t.title),
    ]);
    expect(state.routineSeeded).toBe(ROUTINE_VERSION);
    expect(fake.map.has(STORAGE_KEY)).toBe(true);

    // Second boot from the persisted blob: no duplicates
    expect(loadInitialState(repo).missions).toHaveLength(8);
  });

  it('old save without routineSeeded keeps data and gains the routine', () => {
    const { fake, repo } = setup();
    // Vanilla blob: no routineSeeded field at all (pre-routine save)
    fake.map.set(
      STORAGE_KEY,
      '{"player":{"exp":750,"stamina":40,"intel":24,"coins":33},' +
        '"missions":[{"id":"x","title":"My Own","category":"work","x":1,"y":2,' +
        '"respect":100,"items":[{"id":"i","text":"do","done":false}],' +
        '"rewardGranted":true}],"sound":false}',
    );

    const state = loadInitialState(repo);
    expect(state.player).toEqual({ exp: 750, stamina: 40, intel: 24, coins: 33 });
    expect(state.sound).toBe(false);
    expect(state.routineSeeded).toBe(ROUTINE_VERSION);
    expect(state.missions).toHaveLength(6); // 1 own + 5 routine
    expect(state.missions[0].title).toBe('My Own');
    expect(state.missions[0].rewardGranted).toBe(true);
    expect(state.missions.slice(1).map(m => m.title)).toEqual(
      ROUTINE_MISSIONS.map(t => t.title),
    );
  });

  it('a save already at the current routine version is left untouched', () => {
    const { fake, repo } = setup();
    loadInitialState(repo); // first boot writes routineSeeded: 1
    const stored = fake.map.get(STORAGE_KEY);
    const before = fake.map.size;

    const state = loadInitialState(repo);
    expect(state.missions).toHaveLength(8);
    expect(fake.map.get(STORAGE_KEY)).toBe(stored); // no rewrite
    expect(fake.map.size).toBe(before);
  });

  it('corrupt data falls back to a fresh seed', () => {
    const { fake, repo } = setup();
    fake.map.set(STORAGE_KEY, '{{{ not json');

    const state = loadInitialState(repo);
    expect(state.missions).toHaveLength(8);
    expect(state.player).toEqual(emptyPlayer());
    expect(state.sound).toBe(true);
  });
});
