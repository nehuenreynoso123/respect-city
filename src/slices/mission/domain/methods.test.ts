import { describe, expect, it } from 'vitest';

import { METHODS, methodOf } from './methods';

describe('methods', () => {
  it('has exactly 6 learning methods', () => {
    expect(Object.keys(METHODS)).toHaveLength(6);
  });

  it('returns info for pomodoro', () => {
    expect(methodOf('pomodoro')).toEqual({
      label: 'Pomodoro',
      icon: '🍅',
    });
  });

  it('returns null for absent or invalid values', () => {
    expect(methodOf(undefined)).toBeNull();
    expect(methodOf(null)).toBeNull();
    expect(methodOf('bogus')).toBeNull();
  });
});
