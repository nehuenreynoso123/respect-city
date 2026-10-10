import { describe, expect, it } from 'vitest';

import { EXP_PER_LEVEL, expBarPercent, inLevelExp, levelOf } from './level.js';

describe('level/EXP math (legacy renderHUD)', () => {
  it.each([
    { exp: 0, level: 1, inLevel: 0 },
    { exp: 499, level: 1, inLevel: 499 },
    { exp: 500, level: 2, inLevel: 0 },
    { exp: 1000, level: 3, inLevel: 0 },
  ])('exp $exp → level $level, in-level $inLevel', ({ exp, level, inLevel }) => {
    expect(levelOf(exp)).toBe(level);
    expect(inLevelExp(exp)).toBe(inLevel);
  });

  it('keeps the legacy 500 EXP per level and bar percentage', () => {
    expect(EXP_PER_LEVEL).toBe(500);
    expect(expBarPercent(0)).toBe(0);
    expect(expBarPercent(250)).toBe(50);
    expect(expBarPercent(500)).toBe(0);
  });
});