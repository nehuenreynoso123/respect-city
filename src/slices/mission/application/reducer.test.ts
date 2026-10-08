import { describe, expect, it } from 'vitest';

import { emptyPlayer } from '@/slices/player/domain/player';

import type { Mission } from '../domain/types';
import type { MissionInput } from './commands';
import { reduce } from './reducer';
import type { AppState } from './state';

const makeMission = (over: Partial<Mission> = {}): Mission => ({
  id: 'm1',
  title: 'Test Mission',
  category: 'gym',
  x: 100,
  y: 200,
  respect: 150,
  items: [
    { id: 'i1', text: 'first', done: false },
    { id: 'i2', text: 'second', done: false },
  ],
  ...over,
});

const makeState = (mission: Mission = makeMission()): AppState => ({
  player: emptyPlayer(),
  missions: [mission],
  sound: true,
  routineSeeded: 1,
  selectedId: null,
  filter: 'all',
});

describe('reduce — toggleItem', () => {
  it('partial progress changes the item but does not complete', () => {
    const result = reduce(makeState(), {
      type: 'toggleItem',
      missionId: 'm1',
      itemId: 'i1',
    });
    expect(result.events).toEqual([{ type: 'itemToggled', done: true }]);
    expect(result.state.missions[0].items[0].done).toBe(true);
    expect(result.state.player).toEqual(emptyPlayer());
    expect(result.state.missions[0].rewardGranted).toBeUndefined();
  });

  it('full progress completes once and pays exactly once', () => {
    const r1 = reduce(makeState(), { type: 'toggleItem', missionId: 'm1', itemId: 'i1' });
    const r2 = reduce(r1.state, { type: 'toggleItem', missionId: 'm1', itemId: 'i2' });

    expect(r2.events).toEqual([
      { type: 'itemToggled', done: true },
      { type: 'missionCompleted', missionId: 'm1', firstGrant: true, respect: 150 },
    ]);
    expect(r2.state.player).toEqual({ exp: 150, coins: 15, stamina: 8, intel: 0 });
    expect(r2.state.missions[0].rewardGranted).toBe(true);

    // Uncheck: updates views only — rewardGranted survives, nothing reverts
    const r3 = reduce(r2.state, { type: 'toggleItem', missionId: 'm1', itemId: 'i2' });
    expect(r3.events).toEqual([{ type: 'itemToggled', done: false }]);
    expect(r3.state.player).toEqual({ exp: 150, coins: 15, stamina: 8, intel: 0 });
    expect(r3.state.missions[0].rewardGranted).toBe(true);

    // Re-check: celebrates again but reports firstGrant false, pays nothing
    const r4 = reduce(r3.state, { type: 'toggleItem', missionId: 'm1', itemId: 'i2' });
    expect(r4.events).toEqual([
      { type: 'itemToggled', done: true },
      { type: 'missionCompleted', missionId: 'm1', firstGrant: false, respect: 150 },
    ]);
    expect(r4.state.player).toEqual({ exp: 150, coins: 15, stamina: 8, intel: 0 });
  });

  it('a mission with an empty checklist can never complete', () => {
    const state = makeState(makeMission({ items: [] }));
    expect(reduce(state, { type: 'toggleItem', missionId: 'm1', itemId: 'ghost' }).state)
      .toBe(state);
  });

  it('unknown mission or item is a no-op returning the same reference', () => {
    const state = makeState();
    expect(
      reduce(state, { type: 'toggleItem', missionId: 'nope', itemId: 'i1' }).state,
    ).toBe(state);
    expect(
      reduce(state, { type: 'toggleItem', missionId: 'm1', itemId: 'nope' }).state,
    ).toBe(state);
  });
});

describe('reduce — createMission', () => {
  const input = (over: Partial<MissionInput> = {}): MissionInput => ({
    id: 'm2',
    title: 'New Mission',
    category: 'code',
    x: 10,
    y: 20,
    respect: 100,
    items: [{ id: 'a', text: 'the task' }],
    ...over,
  });

  it('rejects a blank title with the legacy alert message', () => {
    const state = makeState();
    const result = reduce(state, { type: 'createMission', mission: input({ title: '   ' }) });
    expect(result.state).toBe(state);
    expect(result.error).toEqual({
      code: 'missing-title',
      message: 'Give the mission a title.',
    });
  });

  it('rejects when every checklist row is empty', () => {
    const result = reduce(makeState(), {
      type: 'createMission',
      mission: input({ items: [{ id: 'a', text: '  ' }, { id: 'b', text: '' }] }),
    });
    expect(result.error).toEqual({
      code: 'missing-items',
      message: 'Add at least one checklist item.',
    });
  });

  it('rejects when no location was picked', () => {
    const result = reduce(makeState(), { type: 'createMission', mission: input({ x: null }) });
    expect(result.error).toEqual({
      code: 'missing-location',
      message: 'Pick a location on the map first.',
    });
  });

  it('accepts a valid mission, trimming and dropping empty rows', () => {
    const result = reduce(makeState(), {
      type: 'createMission',
      mission: input({
        title: '  Padded  ',
        respect: '5',
        items: [
          { id: 'a', text: ' keep me ' },
          { id: 'b', text: '   ' },
        ],
      }),
    });
    expect(result.error).toBeUndefined();
    expect(result.state.missions).toHaveLength(2);
    expect(result.state.missions[1]).toEqual({
      id: 'm2',
      title: 'Padded',
      category: 'code',
      x: 10,
      y: 20,
      respect: 10, // legacy clamps 5 → 10
      items: [{ id: 'a', text: 'keep me', done: false }],
    });
    expect(result.state.missions[1].rewardGranted).toBeUndefined();
  });

  it('clamps respect exactly like the legacy form parser', () => {
    const respectOf = (respect: MissionInput['respect']) =>
      reduce(makeState(), { type: 'createMission', mission: input({ respect }) }).state
        .missions[1].respect;

    expect(respectOf(0)).toBe(100); // parseInt('0') || 100
    expect(respectOf('abc')).toBe(100);
    expect(respectOf(99999)).toBe(9999);
    expect(respectOf(-5)).toBe(10);
    expect(respectOf(250)).toBe(250);
  });
});

describe('reduce — deleteMission / UI commands', () => {
  it('deletes the mission and closes its panel', () => {
    const state = { ...makeState(), selectedId: 'm1' };
    const result = reduce(state, { type: 'deleteMission', missionId: 'm1' });
    expect(result.state.missions).toEqual([]);
    expect(result.state.selectedId).toBeNull();
  });

  it('keeps the panel open when a different mission is deleted', () => {
    const state = makeState(makeMission({ id: 'other' }));
    state.selectedId = 'm1';
    const result = reduce(state, { type: 'deleteMission', missionId: 'missing' });
    expect(result.state).toBe(state);
  });

  it('toggleSound flips the flag and reports the new value', () => {
    const on = reduce(makeState(), { type: 'toggleSound' });
    expect(on.state.sound).toBe(false);
    expect(on.events).toEqual([{ type: 'soundToggled', enabled: false }]);

    const off = reduce(on.state, { type: 'toggleSound' });
    expect(off.state.sound).toBe(true);
    expect(off.events).toEqual([{ type: 'soundToggled', enabled: true }]);
  });

  it('setFilter and selectMission only touch UI state', () => {
    const state = makeState();
    expect(reduce(state, { type: 'setFilter', filter: 'done' }).state.filter).toBe('done');
    expect(reduce(state, { type: 'selectMission', missionId: 'm1' }).state.selectedId)
      .toBe('m1');
    expect(
      reduce({ ...state, selectedId: 'm1' }, { type: 'selectMission', missionId: null }).state
        .selectedId,
    ).toBeNull();
  });
});
