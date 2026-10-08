import { describe, expect, it } from 'vitest';

import { STAT_CAP, emptyPlayer } from '../domain/player';
import type { RewardDelta } from '../domain/reward';
import { playerReducer } from './reducer';

const grant = (delta: Partial<RewardDelta>): RewardDelta => ({
  exp: 0,
  coins: 0,
  stamina: 0,
  intel: 0,
  ...delta,
});

describe('playerReducer — rewardsGranted', () => {
  it('adds exp and coins to the player', () => {
    const player = playerReducer(emptyPlayer(), {
      type: 'rewardsGranted',
      delta: grant({ exp: 300, coins: 30 }),
    });
    expect(player).toEqual({ exp: 300, stamina: 0, intel: 0, coins: 30 });
  });

  it('caps stamina and intel at 100', () => {
    const player = playerReducer(
      { exp: 0, stamina: 95, intel: 96, coins: 0 },
      { type: 'rewardsGranted', delta: grant({ stamina: 8, intel: 8 }) },
    );
    expect(player.stamina).toBe(STAT_CAP);
    expect(player.intel).toBe(STAT_CAP);
  });

  it('coins are never capped by the +8 rule (legacy grants ceil only)', () => {
    const player = playerReducer(
      { exp: 0, stamina: 95, intel: 0, coins: 95 },
      { type: 'rewardsGranted', delta: grant({ coins: 15 }) },
    );
    expect(player.coins).toBe(110);
    expect(player.stamina).toBe(95); // untouched stats stay untouched
  });
});
