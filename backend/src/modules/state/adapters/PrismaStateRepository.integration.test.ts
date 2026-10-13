import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { prisma } from '../../../shared/db/prisma.js';
import type { Mission } from '../../mission/domain/types.js';
import type { PersistedGameState } from '../ports/StateRepository.js';
import { PrismaStateRepository } from './PrismaStateRepository.js';

/**
 * Real-DB round trip against the Docker Postgres: create → findByUser with
 * the new Player flags (sound, routineSeeded) and the Mission method column.
 * Rows are cleaned per test by deleting the created user (cascade removes
 * player/missions/items).
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
});