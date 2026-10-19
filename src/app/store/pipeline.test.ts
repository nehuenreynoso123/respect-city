import { describe, expect, it, vi } from 'vitest';

import type { AppCommand } from '@/slices/mission/application/commands';
import type { PersistedState } from '@/slices/mission/application/state';
import type { GameRepository } from '@/slices/mission/ports/GameRepository';

import { isLocalCommand, mutationOf } from './pipeline';

const snapshot: PersistedState = {
  player: { exp: 0, stamina: 0, intel: 0, coins: 0 },
  missions: [],
  sound: true,
  routineSeeded: 1,
};

function fakeRepo() {
  const load = vi.fn(async () => snapshot);
  const createMission = vi.fn(async () => snapshot);
  const deleteMission = vi.fn(async () => snapshot);
  const toggleItem = vi.fn(async () => snapshot);
  const toggleSound = vi.fn(async () => snapshot);
  const repo: GameRepository = { load, createMission, deleteMission, toggleItem, toggleSound };
  return { repo, load, createMission, deleteMission, toggleItem, toggleSound };
}

describe('isLocalCommand', () => {
  it('is true only for selectMission and setFilter', () => {
    expect(isLocalCommand({ type: 'selectMission', missionId: 'm1' })).toBe(true);
    expect(isLocalCommand({ type: 'setFilter', filter: 'done' })).toBe(true);
    expect(isLocalCommand({ type: 'toggleSound' })).toBe(false);
    expect(isLocalCommand({ type: 'deleteMission', missionId: 'm1' })).toBe(false);
  });
});

describe('mutationOf', () => {
  it('maps toggleItem to repo.toggleItem', async () => {
    const { repo, toggleItem } = fakeRepo();
    const plan = mutationOf(repo, { type: 'toggleItem', missionId: 'm1', itemId: 'i1' }, snapshot);

    expect(plan?.snapshot).toBe(snapshot);
    await plan?.run();
    expect(toggleItem).toHaveBeenCalledWith('m1', 'i1');
  });

  it('maps createMission to repo.createMission with the input', async () => {
    const { repo, createMission } = fakeRepo();
    const command: AppCommand = {
      type: 'createMission',
      mission: {
        id: 'm2',
        title: 'New',
        category: 'code',
        x: 1,
        y: 2,
        respect: 100,
        items: [{ id: 'a', text: 'task' }],
      },
    };

    await mutationOf(repo, command, snapshot)?.run();
    expect(createMission).toHaveBeenCalledWith(command.mission);
  });

  it('maps deleteMission to repo.deleteMission', async () => {
    const { repo, deleteMission } = fakeRepo();
    await mutationOf(repo, { type: 'deleteMission', missionId: 'm9' }, snapshot)?.run();
    expect(deleteMission).toHaveBeenCalledWith('m9');
  });

  it('sends the NEW sound value (the negation of the snapshot flag)', async () => {
    const { repo, toggleSound } = fakeRepo();
    await mutationOf(repo, { type: 'toggleSound' }, snapshot)?.run();
    expect(toggleSound).toHaveBeenCalledWith(false);
  });

  it('returns null for local-only and replaceState commands', () => {
    const { repo } = fakeRepo();
    expect(mutationOf(repo, { type: 'selectMission', missionId: 'm1' }, snapshot)).toBeNull();
    expect(mutationOf(repo, { type: 'setFilter', filter: 'done' }, snapshot)).toBeNull();
    expect(mutationOf(repo, { type: 'replaceState', state: snapshot }, snapshot)).toBeNull();
  });
});
