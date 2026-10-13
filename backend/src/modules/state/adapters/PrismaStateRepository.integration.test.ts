import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { prisma } from '../../../shared/db/prisma.js';
import { toggleMissionItem } from '../../mission/application/toggleMissionItem.js';
import type { Mission } from '../../mission/domain/types.js';
import type { PersistedGameState } from '../ports/StateRepository.js';
import { PrismaStateRepository } from './PrismaStateRepository.js';

/**
 * Real-DB round trip against the Docker Postgres: create → findByUser with
 * the new Player flags (sound, routineSeeded) and the Mission method column,
 * plus an authoritative toggle through the real adapter proving the grant
 * happens exactly once across reads. Rows are cleaned per test by deleting
 * the created user (cascade removes player/missions/items).
 */
const repo = new PrismaStateRepository(prisma);

async function createUserWithState(state: PersistedGameState): Promise<string> {
  const user = await prisma.user.create({
    data: { email: `it-${randomUUID()}@test.local`, passwordHash: 'integration-hash' },
  });
  await repo.create(user.id, state);
  return user.id;
}

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: 'it-' } } });
});

const mission = (overrides: Partial<Mission> = {}): Mission => ({
  id: `m-${randomUUID()}`,
  title: 'Gym',
  category: 'gym',
  x: 0,
  y: 0,
  respect: 100,
  items: [{ id: `i-${randomUUID()}`, text: 'one', done: false }],
  ...overrides,
});

describe('PrismaStateRepository integration', () => {
  it('round-trips player flags and the mission method through create/findByUser', async () => {
    const m = mission({ method: 'active-recall' });
    const state: PersistedGameState = {
      player: { exp: 40, stamina: 12, intel: 73, coins: 900 },
      missions: [m],
      sound: false,
      routineSeeded: 1,
    };

    const userId = await createUserWithState(state);
    const got = await repo.findByUser(userId);

    expect(got).not.toBeNull();
    expect(got?.player).toEqual(state.player);
    expect(got?.sound).toBe(false);
    expect(got?.routineSeeded).toBe(1);
    expect(got?.missions).toHaveLength(1);
    expect(got?.missions[0].method).toBe('active-recall');
    expect(got?.missions[0].items).toEqual(m.items);
  });

  it('grants once through the real repo and never double-grants across reads', async () => {
    const m = mission();
    const state: PersistedGameState = {
      player: { exp: 0, stamina: 0, intel: 0, coins: 0 },
      missions: [m],
      sound: true,
      routineSeeded: 0,
    };

    const userId = await createUserWithState(state);
    const itemId = m.items[0].id;

    const afterGrant = await toggleMissionItem(repo, userId, m.id, itemId);
    expect(afterGrant.player).toEqual({ exp: 100, stamina: 8, intel: 0, coins: 10 });
    expect(afterGrant.missions[0].rewardGranted).toBe(true);

    const reread = await repo.findByUser(userId);
    expect(reread?.player).toEqual({ exp: 100, stamina: 8, intel: 0, coins: 10 });
    expect(reread?.missions[0].rewardGranted).toBe(true);

    // Uncheck, then re-check: the transition is done → not-done → done, but
    // rewardGranted persisted, so the second completion pays nothing.
    const afterUncheck = await toggleMissionItem(repo, userId, m.id, itemId);
    expect(afterUncheck.missions[0].items[0].done).toBe(false);
    const afterRecheck = await toggleMissionItem(repo, userId, m.id, itemId);
    expect(afterRecheck.missions[0].items[0].done).toBe(true);
    expect(afterRecheck.player).toEqual({ exp: 100, stamina: 8, intel: 0, coins: 10 });
    expect(afterRecheck.missions[0].rewardGranted).toBe(true);

    const finalRead = await repo.findByUser(userId);
    expect(finalRead?.player).toEqual({ exp: 100, stamina: 8, intel: 0, coins: 10 });
    expect(finalRead?.missions[0].rewardGranted).toBe(true);
  });
});