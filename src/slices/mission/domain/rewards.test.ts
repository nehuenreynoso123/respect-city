import { describe, expect, it } from 'vitest';

import { computeMissionReward } from './rewards';
import type { Mission } from './types';

const mission = (over: Partial<Mission>): Mission => ({
  id: 'm1',
  title: 'Test',
  category: 'gym',
  x: 0,
  y: 0,
  respect: 150,
  items: [],
  ...over,
});

describe('computeMissionReward (legacy completeMission math)', () => {
  it('gym grants exp + coins +8 stamina', () => {
    expect(computeMissionReward(mission({ category: 'gym', respect: 150 }))).toEqual({
      exp: 150,
      coins: 15,
      stamina: 8,
      intel: 0,
    });
  });

  it('health also grants stamina', () => {
    expect(computeMissionReward(mission({ category: 'health', respect: 60 }))).toEqual({
      exp: 60,
      coins: 6,
      stamina: 8,
      intel: 0,
    });
  });

  it('code grants intel only', () => {
    expect(computeMissionReward(mission({ category: 'code', respect: 300 }))).toEqual({
      exp: 300,
      coins: 30,
      stamina: 0,
      intel: 8,
    });
  });

  it('work (stat = coins) grants no attribute — coins come from ceil only', () => {
    expect(computeMissionReward(mission({ category: 'work', respect: 105 }))).toEqual({
      exp: 105,
      coins: 11, // ceil(105/10)
      stamina: 0,
      intel: 0,
    });
  });

  it('unknown category falls back to work rules', () => {
    const unknownCategory = {
      ...mission({ respect: 10 }),
      category: 'chess',
    } as unknown as Mission; // outside CategoryKey on purpose — legacy fallback
    expect(computeMissionReward(unknownCategory)).toEqual({
      exp: 10,
      coins: 1,
      stamina: 0,
      intel: 0,
    });
  });
});
