import { describe, expect, it } from 'vitest';

import { fakeStateRepository } from '../../../test-support/fakeStateRepository.js';
import type { Mission } from '../domain/types.js';
import type { PersistedGameState } from '../../state/ports/StateRepository.js';
import { deleteMission } from './deleteMission.js';

const mission = (id: string): Mission => ({
  id,
  title: 'Mission',
  category: 'gym',
  x: 0,
  y: 0,
  respect: 100,
  items: [{ id: `${id}-i1`, text: 'one', done: false }],
});

const state = (missions: Mission[]): PersistedGameState => ({
  player: { exp: 0, stamina: 0, intel: 0, coins: 0 },
  missions,
  sound: true,
  routineSeeded: 0,
});

describe('deleteMission', () => {
  it('removes the mission and returns the state without it', async () => {
    const repo = fakeStateRepository(state([mission('m1'), mission('m2')]));
    const result = await deleteMission(repo, 'u1', 'm1');

    expect(result.missions.map(m => m.id)).toEqual(['m2']);
    expect(repo.saved).toHaveLength(1);
    expect(repo.current).toEqual(result);
  });

  it('fails with 404 when the mission is unknown', async () => {
    const repo = fakeStateRepository(state([mission('m1')]));
    await expect(
      deleteMission(repo, 'u1', 'nope'),
    ).rejects.toMatchObject({ code: 'not-found', statusCode: 404, message: 'Mission not found.' });
  });

  it('fails with 404 when the account has no state', async () => {
    await expect(
      deleteMission(fakeStateRepository(null), 'u1', 'm1'),
    ).rejects.toMatchObject({ code: 'state-not-found', statusCode: 404 });
  });
});