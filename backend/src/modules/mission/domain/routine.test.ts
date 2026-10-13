import { describe, expect, it } from 'vitest';

import {
  ROUTINE_MISSIONS,
  ROUTINE_VERSION,
  mergeRoutine,
  seedMissions,
} from './routine.js';

describe('seedMissions', () => {
  it('returns the 3 demo missions, all unchecked', () => {
    const missions = seedMissions();
    expect(missions.map(m => m.title)).toEqual([
      'Morning Workout',
      'Ship Login Feature',
      'Drink 2L of Water',
    ]);
    expect(missions.every(m => m.items.length > 0 && m.items.every(i => !i.done))).toBe(true);
  });
});

describe('mergeRoutine', () => {
  const fresh = () => ({ missions: seedMissions(), routineSeeded: 0 });

  it('first run injects the 5 routine blocks and bumps the version', () => {
    const merged = mergeRoutine(fresh());
    expect(merged.missions).toHaveLength(8);
    expect(merged.routineSeeded).toBe(ROUTINE_VERSION);
    expect(merged.missions.slice(3).map(m => m.title)).toEqual(
      ROUTINE_MISSIONS.map(t => t.title),
    );
    expect(merged.missions[3].items.every(i => i.id !== '' && !i.done)).toBe(true);
  });

  it('second run adds nothing and returns the same reference', () => {
    const once = mergeRoutine(fresh());
    const twice = mergeRoutine(once);
    expect(twice).toBe(once);
    expect(twice.missions).toHaveLength(8);
  });

  it('a manually deleted routine mission stays deleted once seeded', () => {
    const deletedTitle = ROUTINE_MISSIONS[0].title;
    const once = mergeRoutine(fresh());
    const afterDelete = {
      missions: once.missions.filter(m => m.title !== deletedTitle),
      routineSeeded: ROUTINE_VERSION,
    };
    const remerged = mergeRoutine(afterDelete);
    expect(remerged).toBe(afterDelete); // guard short-circuits, no persist
    expect(remerged.missions).toHaveLength(7);
    expect(remerged.missions.some(m => m.title === deletedTitle)).toBe(false);
  });

  it('an unseeded state re-adds only the routine titles that are missing', () => {
    const deletedTitle = ROUTINE_MISSIONS[0].title;
    const once = mergeRoutine(fresh());
    const afterDelete = {
      missions: once.missions.filter(m => m.title !== deletedTitle),
      routineSeeded: 0,
    };
    const remerged = mergeRoutine(afterDelete);
    expect(remerged.missions).toHaveLength(8); // 7 kept + 1 re-added
    expect(remerged.missions.some(m => m.title === deletedTitle)).toBe(true);
    expect(remerged.routineSeeded).toBe(ROUTINE_VERSION);
  });
});