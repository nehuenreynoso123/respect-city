import { describe, expect, it } from 'vitest';

import { DEFAULT_LIFT, extrudeRect, type Footprint } from './extrusion';

describe('DEFAULT_LIFT', () => {
  it('lifts the top face up-left to reveal the south and east walls', () => {
    expect(DEFAULT_LIFT).toEqual({ x: -0.30, y: -0.55 });
  });
});

describe('extrudeRect', () => {
  it('emits exact path strings for the default lift', () => {
    const footprint: Footprint = { x: 10, y: 20, w: 30, h: 40 };

    expect(extrudeRect(footprint, 100)).toEqual({
      top: 'M -20 -35 L 10 -35 L 10 5 L -20 5 Z',
      front: 'M 10 60 L 40 60 L 10 5 L -20 5 Z',
      right: 'M 40 20 L 40 60 L 10 5 L 10 -35 Z',
    });
  });

  it('honours a custom lift, scaled by depth', () => {
    const footprint: Footprint = { x: 0, y: 0, w: 10, h: 20 };
    const lift = { x: 0.5, y: 0.25 };

    expect(extrudeRect(footprint, 10, lift)).toEqual({
      top: 'M 5 2.5 L 15 2.5 L 15 22.5 L 5 22.5 Z',
      front: 'M 0 20 L 10 20 L 15 22.5 L 5 22.5 Z',
      right: 'M 10 0 L 10 20 L 15 22.5 L 15 2.5 Z',
    });
  });

  it('flattens the top face onto the base rect at depth 0', () => {
    const footprint: Footprint = { x: 12, y: 34, w: 56, h: 78 };

    expect(extrudeRect(footprint, 0)).toEqual({
      top: 'M 12 34 L 68 34 L 68 112 L 12 112 Z',
      front: 'M 12 112 L 68 112 L 68 112 L 12 112 Z',
      right: 'M 68 34 L 68 112 L 68 112 L 68 34 Z',
    });
  });

  it('rounds emitted numbers to two decimals (no float noise)', () => {
    const footprint: Footprint = { x: 28.8, y: 1, w: 2, h: 3 };

    // 28.8 - 0.3 * 0.2 is 28.740000000000002 in raw floating point.
    expect(extrudeRect(footprint, 0.2).top).toBe(
      'M 28.74 0.89 L 30.74 0.89 L 30.74 3.89 L 28.74 3.89 Z',
    );
  });

  it.each([
    ['negative', -1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
  ])('throws RangeError for %s depth', (_label, depth) => {
    const footprint: Footprint = { x: 0, y: 0, w: 10, h: 10 };

    expect(() => extrudeRect(footprint, depth)).toThrow(RangeError);
    expect(() => extrudeRect(footprint, depth)).toThrow(/finite number >= 0/);
  });

  it('closes every face and leaves the inputs untouched', () => {
    const footprint = Object.freeze<Footprint>({ x: 1, y: 2, w: 3, h: 4 });
    const lift = Object.freeze({ x: 0.4, y: 0.6 });

    const faces = extrudeRect(footprint, 7, lift);

    expect(faces.top.endsWith('Z')).toBe(true);
    expect(faces.front.endsWith('Z')).toBe(true);
    expect(faces.right.endsWith('Z')).toBe(true);
    expect(footprint).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    expect(lift).toEqual({ x: 0.4, y: 0.6 });
    expect(DEFAULT_LIFT).toEqual({ x: -0.30, y: -0.55 });
  });
});
