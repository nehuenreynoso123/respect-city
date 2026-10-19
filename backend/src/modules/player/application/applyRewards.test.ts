import { describe, expect, it } from 'vitest';

import type { Player } from '../domain/player.js';
import { applyRewards } from './applyRewards.js';

const player = (overrides: Partial<Player> = {}): Player => ({
  exp: 0,
  stamina: 0,
  intel: 0,
  coins: 0,
  ...overrides,
});

describe('applyRewards', () => {
  it('adds exp and coins without a cap', () => {
    const next = applyRewards(player({ exp: 999_999, coins: 999_999 }), {
      exp: 500, coins: 50, stamina: 0, intel: 0,
    });
    expect(next.exp).toBe(1_000_499);
    expect(next.coins).toBe(1_000_049);
  });

  it('caps stamina at 100 when the delta is positive', () => {
    const next = applyRewards(player({ stamina: 96 }), {
      exp: 100, coins: 10, stamina: 8, intel: 0,
    });
    expect(next.stamina).toBe(100);
  });

  it('caps intel at 100 when the delta is positive', () => {
    const next = applyRewards(player({ intel: 99 }), {
      exp: 100, coins: 10, stamina: 0, intel: 8,
    });
    expect(next.intel).toBe(100);
  });

  it('adds stamina below the cap', () => {
    const next = applyRewards(player({ stamina: 10 }), {
      exp: 100, coins: 10, stamina: 8, intel: 0,
    });
    expect(next.stamina).toBe(18);
  });

  it('leaves a stat alone when its delta is zero', () => {
    const next = applyRewards(player({ stamina: 10, intel: 10 }), {
      exp: 100, coins: 10, stamina: 8, intel: 0,
    });
    expect(next.intel).toBe(10);
    const zero = applyRewards(player({ stamina: 10, intel: 10 }), {
      exp: 100, coins: 10, stamina: 0, intel: 0,
    });
    expect(zero.stamina).toBe(10);
    expect(zero.intel).toBe(10);
  });

  it('keeps every untouched attribute identical', () => {
    const before = player({ exp: 5, stamina: 20, intel: 30, coins: 7 });
    const next = applyRewards(before, { exp: 10, coins: 1, stamina: 0, intel: 0 });
    expect(next).toEqual({ exp: 15, stamina: 20, intel: 30, coins: 8 });
  });
});