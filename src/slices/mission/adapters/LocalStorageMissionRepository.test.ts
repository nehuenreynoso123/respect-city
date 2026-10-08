import { describe, expect, it } from 'vitest';

import type { StoragePort } from '@/slices/storage/ports/StoragePort';

import { STORAGE_KEY } from '../application/persistence';
import type { PersistedState } from '../application/state';
import { LocalStorageMissionRepository } from './LocalStorageMissionRepository';

class FakeStorage implements StoragePort {
  readonly map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const storedState: PersistedState = {
  player: { exp: 750, stamina: 40, intel: 24, coins: 33 },
  missions: [
    {
      id: 'm1',
      title: 'Ship Login Feature',
      category: 'code',
      x: 1240,
      y: 740,
      respect: 300,
      items: [{ id: 'i1', text: 'Define API contract', done: true }],
      rewardGranted: true,
    },
  ],
  sound: false,
  routineSeeded: 1,
};

describe('LocalStorageMissionRepository (fake StoragePort)', () => {
  it('round-trips the whole state, including rewardGranted and routineSeeded', () => {
    const fake = new FakeStorage();
    const repo = new LocalStorageMissionRepository(fake);

    repo.save(storedState);
    expect(repo.load()).toEqual(storedState);
  });

  it('writes under the legacy key with the legacy JSON shape', () => {
    const fake = new FakeStorage();
    new LocalStorageMissionRepository(fake).save(storedState);

    const raw = fake.map.get(STORAGE_KEY);
    expect(raw).toBeDefined();
    expect(Object.keys(JSON.parse(raw as string))).toEqual([
      'player',
      'missions',
      'sound',
      'routineSeeded',
    ]);
  });

  it('reads a blob already sitting in the browser from the vanilla app', () => {
    const fake = new FakeStorage();
    const legacyBlob =
      '{"player":{"exp":750,"stamina":40,"intel":24,"coins":33},' +
      '"missions":[{"id":"m1","title":"Ship Login Feature","category":"code",' +
      '"x":1240,"y":740,"respect":300,"items":[{"id":"i1",' +
      '"text":"Define API contract","done":true}],"rewardGranted":true}],' +
      '"sound":false,"routineSeeded":1}';
    fake.map.set(STORAGE_KEY, legacyBlob);

    expect(new LocalStorageMissionRepository(fake).load()).toEqual(storedState);
  });

  it('returns null for missing or corrupt data', () => {
    const fake = new FakeStorage();
    const repo = new LocalStorageMissionRepository(fake);
    expect(repo.load()).toBeNull();

    fake.map.set(STORAGE_KEY, '{{{ not json');
    expect(repo.load()).toBeNull();
  });
});
