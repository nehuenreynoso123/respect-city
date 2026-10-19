import { describe, expect, it } from 'vitest';

import { fakeStateRepository } from '../../../test-support/fakeStateRepository.js';
import { ROUTINE_VERSION } from '../../mission/domain/routine.js';
import type { PersistedGameState } from '../ports/StateRepository.js';
import { getOrCreateState } from './getOrCreateState.js';

const DEMO_MISSIONS = 3;
const ROUTINE_MISSIONS = 5;

describe('getOrCreateState', () => {
  it('seeds demo + routine missions on first access and persists the aggregate', async () => {
    const repo = fakeStateRepository(null);
    const state = await getOrCreateState(repo, 'u1');

    expect(state).toEqual(repo.current);
    expect(state.player).toEqual({ exp: 0, stamina: 0, intel: 0, coins: 0 });
    expect(state.sound).toBe(true);
    expect(state.routineSeeded).toBe(ROUTINE_VERSION);
    expect(state.missions).toHaveLength(DEMO_MISSIONS + ROUTINE_MISSIONS);
    // A brand-new account persists through create(); save() is not used.
    expect(repo.saved).toHaveLength(0);
  });

  it('returns the existing state without re-saving when the routine is current', async () => {
    const repo = fakeStateRepository(null);
    const first = await getOrCreateState(repo, 'u1');
    const second = await getOrCreateState(repo, 'u1');

    expect(second).toBe(first);
    expect(repo.saved).toHaveLength(0);
  });

  it('merges the routine once into a legacy state below ROUTINE_VERSION', async () => {
    const legacy: PersistedGameState = {
      player: { exp: 5, stamina: 1, intel: 2, coins: 3 },
      missions: [
        {
          id: 'legacy-1',
          title: 'Old mission',
          category: 'gym',
          x: 0,
          y: 0,
          respect: 50,
          items: [],
        },
      ],
      sound: false,
      routineSeeded: 0,
    };
    const repo = fakeStateRepository(legacy);

    const merged = await getOrCreateState(repo, 'u1');
    expect(merged.routineSeeded).toBe(ROUTINE_VERSION);
    expect(merged.missions).toHaveLength(1 + ROUTINE_MISSIONS);
    expect(merged.missions[0]).toEqual(legacy.missions[0]);
    expect(repo.saved).toHaveLength(1);

    // Second read: routine is current → same reference, no extra save.
    const again = await getOrCreateState(repo, 'u1');
    expect(again).toBe(merged);
    expect(repo.saved).toHaveLength(1);
  });
});
