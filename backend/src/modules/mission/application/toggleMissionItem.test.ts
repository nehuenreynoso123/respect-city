import { describe, expect, it } from 'vitest';

import { fakeStateRepository } from '../../../test-support/fakeStateRepository.js';
import type { Player } from '../../player/domain/player.js';
import type { Mission } from '../domain/types.js';
import type { PersistedGameState } from '../../state/ports/StateRepository.js';
import { toggleMissionItem } from './toggleMissionItem.js';

const mission = (overrides: Partial<Mission> = {}): Mission => ({
  id: 'm1',
  title: 'Gym',
  category: 'gym',
  x: 0,
  y: 0,
  respect: 100,
  items: [{ id: 'i1', text: 'one', done: false }],
  ...overrides,
});

const state = (player: Player, missions: Mission[]): PersistedGameState => ({
  player,
  missions,
  sound: true,
  routineSeeded: 0,
});

describe('toggleMissionItem', () => {
  it('grants exp/coins/stamina exactly once on first completion and sets rewardGranted', async () => {
    const repo = fakeStateRepository(state({ exp: 0, stamina: 0, intel: 0, coins: 0 }, [mission()]));
    const result = await toggleMissionItem(repo, 'u1', 'm1', 'i1');

    expect(result.player).toEqual({ exp: 100, stamina: 8, intel: 0, coins: 10 });
    expect(result.missions[0].rewardGranted).toBe(true);
    expect(result.missions[0].items[0].done).toBe(true);
    expect(repo.saved).toHaveLength(1);
  });

  it('does not double-grant when the item is unchecked and re-checked (anti-cheat)', async () => {
    const repo = fakeStateRepository(state({ exp: 0, stamina: 0, intel: 0, coins: 0 }, [mission()]));
    const afterFirst = await toggleMissionItem(repo, 'u1', 'm1', 'i1');

    const afterUncheck = await toggleMissionItem(repo, 'u1', 'm1', 'i1');
    expect(afterUncheck.player).toEqual(afterFirst.player);
    expect(afterUncheck.missions[0].items[0].done).toBe(false);
    expect(afterUncheck.missions[0].rewardGranted).toBe(true);

    const afterRecheck = await toggleMissionItem(repo, 'u1', 'm1', 'i1');
    expect(afterRecheck.player).toEqual(afterFirst.player);
    expect(afterRecheck.missions[0].items[0].done).toBe(true);
    expect(afterRecheck.missions[0].rewardGranted).toBe(true);
  });

  it('caps stats at 100 for a player near the cap', async () => {
    const repo = fakeStateRepository(
      state({ exp: 0, stamina: 96, intel: 0, coins: 0 }, [mission()]),
    );
    const result = await toggleMissionItem(repo, 'u1', 'm1', 'i1');
    expect(result.player.stamina).toBe(100);
    expect(result.player.exp).toBe(100);
    expect(result.player.coins).toBe(10);
  });

  it('grants intel for an intel category', async () => {
    const repo = fakeStateRepository(
      state({ exp: 0, stamina: 0, intel: 20, coins: 0 }, [mission({ category: 'code' })]),
    );
    const result = await toggleMissionItem(repo, 'u1', 'm1', 'i1');
    expect(result.player.intel).toBe(28);
    expect(result.player.stamina).toBe(0);
  });

  it('unchecking an already-claimed mission never refunds or clears rewardGranted', async () => {
    const claimed = mission({ rewardGranted: true, items: [{ id: 'i1', text: 'one', done: true }] });
    const repo = fakeStateRepository(state({ exp: 55, stamina: 9, intel: 9, coins: 5 }, [claimed]));
    const result = await toggleMissionItem(repo, 'u1', 'm1', 'i1');

    expect(result.player).toEqual({ exp: 55, stamina: 9, intel: 9, coins: 5 });
    expect(result.missions[0].items[0].done).toBe(false);
    expect(result.missions[0].rewardGranted).toBe(true);
  });

  it('fails with 404 when the mission is unknown', async () => {
    const repo = fakeStateRepository(state({ exp: 0, stamina: 0, intel: 0, coins: 0 }, [mission()]));
    await expect(
      toggleMissionItem(repo, 'u1', 'nope', 'i1'),
    ).rejects.toMatchObject({ code: 'not-found', statusCode: 404 });
  });

  it('fails with 404 when the item is unknown', async () => {
    const repo = fakeStateRepository(state({ exp: 0, stamina: 0, intel: 0, coins: 0 }, [mission()]));
    await expect(
      toggleMissionItem(repo, 'u1', 'm1', 'nope'),
    ).rejects.toMatchObject({ code: 'not-found', statusCode: 404 });
  });

  it('fails with 404 when the account has no state', async () => {
    await expect(
      toggleMissionItem(fakeStateRepository(null), 'u1', 'm1', 'i1'),
    ).rejects.toMatchObject({ code: 'state-not-found', statusCode: 404 });
  });
});