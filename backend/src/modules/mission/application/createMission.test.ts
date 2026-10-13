import { describe, expect, it } from 'vitest';

import { fakeStateRepository } from '../../../test-support/fakeStateRepository.js';
import type { PersistedGameState } from '../../state/ports/StateRepository.js';
import { createMission, type CreateMissionInput } from './createMission.js';

const baseState = (): PersistedGameState => ({
  player: { exp: 0, stamina: 0, intel: 0, coins: 0 },
  missions: [],
  sound: true,
  routineSeeded: 0,
});

const input = (overrides: Partial<CreateMissionInput> = {}): CreateMissionInput => ({
  id: 'm1',
  title: 'Run',
  category: 'gym',
  x: 10,
  y: 20,
  respect: 500,
  items: [{ id: 'a', text: 'Do it' }],
  ...overrides,
});

describe('createMission', () => {
  it('normalizes the input and appends the mission without rewardGranted', async () => {
    const repo = fakeStateRepository(baseState());
    const result = await createMission(repo, 'u1', input({
      title: '  Run  ',
      respect: '500',
      items: [
        { id: 'a', text: '   ' },
        { id: 'b', text: '  Do it  ' },
      ],
      method: 'pomodoro',
    }));

    expect(result.missions).toHaveLength(1);
    expect(result.missions[0]).toEqual({
      id: 'm1',
      title: 'Run',
      category: 'gym',
      x: 10,
      y: 20,
      respect: 500,
      items: [{ id: 'b', text: 'Do it', done: false }],
      method: 'pomodoro',
    });
    expect(result.missions[0].rewardGranted).toBeUndefined();
    expect(repo.saved).toHaveLength(1);
    expect(repo.current).toEqual(result);
  });

  it('falls back to respect 100 on NaN and clamps to 10..9999', async () => {
    const fallback = await createMission(fakeStateRepository(baseState()), 'u1', input({ respect: '' }));
    expect(fallback.missions[0].respect).toBe(100);

    const low = await createMission(fakeStateRepository(baseState()), 'u1', input({ respect: '6' }));
    expect(low.missions[0].respect).toBe(10);

    const high = await createMission(fakeStateRepository(baseState()), 'u1', input({ respect: '99999' }));
    expect(high.missions[0].respect).toBe(9999);
  });

  it('accepts a numeric respect value', async () => {
    const result = await createMission(fakeStateRepository(baseState()), 'u1', input({ respect: 150 }));
    expect(result.missions[0].respect).toBe(150);
  });

  it('rejects an empty title', async () => {
    await expect(
      createMission(fakeStateRepository(baseState()), 'u1', input({ title: '   ' })),
    ).rejects.toMatchObject({ code: 'missing-title', statusCode: 400, message: 'Give the mission a title.' });
  });

  it('rejects a mission with no checklist items', async () => {
    await expect(
      createMission(fakeStateRepository(baseState()), 'u1', input({ items: [{ id: 'a', text: ' ' }] })),
    ).rejects.toMatchObject({ code: 'missing-items', statusCode: 400, message: 'Add at least one checklist item.' });
  });

  it('rejects a mission without a map location', async () => {
    await expect(
      createMission(fakeStateRepository(baseState()), 'u1', input({ x: null })),
    ).rejects.toMatchObject({ code: 'missing-location', statusCode: 400, message: 'Pick a location on the map first.' });
  });

  it('fails with 404 when the account has no state', async () => {
    await expect(
      createMission(fakeStateRepository(null), 'u1', input()),
    ).rejects.toMatchObject({ code: 'state-not-found', statusCode: 404 });
  });
});