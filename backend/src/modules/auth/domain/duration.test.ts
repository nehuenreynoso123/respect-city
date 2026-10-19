import { describe, expect, it } from 'vitest';

import { durationToSeconds } from './duration.js';

describe('durationToSeconds', () => {
  it('parses day/hour/minute/second suffixes', () => {
    expect(durationToSeconds('7d')).toBe(7 * 24 * 60 * 60);
    expect(durationToSeconds('12h')).toBe(12 * 60 * 60);
    expect(durationToSeconds('30m')).toBe(30 * 60);
    expect(durationToSeconds('45s')).toBe(45);
  });

  it('treats bare digits as seconds', () => {
    expect(durationToSeconds('60')).toBe(60);
    expect(durationToSeconds('0')).toBe(0);
  });

  it('tolerates surrounding whitespace', () => {
    expect(durationToSeconds(' 7d ')).toBe(7 * 24 * 60 * 60);
  });

  it.each(['', 'd', '7x', '7days', '-1d', '1.5h', '7 D', '7d7'])(
    'throws on invalid input %j',
    (value) => {
      expect(() => durationToSeconds(value)).toThrow(/Invalid duration/);
    },
  );
});
