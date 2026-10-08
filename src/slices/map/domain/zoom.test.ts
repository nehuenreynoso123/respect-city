import { describe, expect, it } from 'vitest';

import { toWorld, ZOOM_MAX, ZOOM_MIN } from './view';
import { beginPinch, pinchView, wheelFactor, zoomAtPoint, zoomByCenter } from './zoom';

describe('wheelFactor', () => {
  it('zooms in by 1.12 when scrolling up', () => {
    expect(wheelFactor(-100)).toBe(1.12);
  });

  it('zooms out by 1 / 1.12 when scrolling down', () => {
    expect(wheelFactor(100)).toBe(1 / 1.12);
  });
});

describe('zoomAtPoint', () => {
  const vpW = 800;
  const vpH = 600;

  it('keeps the world point under the cursor fixed (legacy wheel math)', () => {
    const next = zoomAtPoint({ x: 0, y: 0, s: 1 }, 1.12, 400, 300, vpW, vpH);
    expect(next.s).toBeCloseTo(1.12, 10);
    expect(next.x).toBeCloseTo(-48, 10);
    expect(next.y).toBeCloseTo(-36, 10);
    const world = toWorld(next, 400, 300);
    expect(world.x).toBeCloseTo(400, 10);
    expect(world.y).toBeCloseTo(300, 10);
  });

  it('clamps the scale at ZOOM_MAX', () => {
    const next = zoomAtPoint({ x: 0, y: 0, s: ZOOM_MAX }, 1.12, 400, 300, vpW, vpH);
    expect(next.s).toBe(ZOOM_MAX);
  });

  it('clamps the scale at ZOOM_MIN', () => {
    const next = zoomAtPoint({ x: 0, y: 0, s: ZOOM_MIN }, 1 / 1.12, 400, 300, vpW, vpH);
    expect(next.s).toBe(ZOOM_MIN);
  });

  it('clamps the position after anchoring (legacy order: anchor, then clampView)', () => {
    const next = zoomAtPoint({ x: -2600, y: -1700, s: 1.12 }, 1 / 1.12, 0, 0, vpW, vpH);
    const w = 2400 * next.s;
    expect(next.x).toBeGreaterThanOrEqual(80 - w);
    expect(next.x).toBeLessThanOrEqual(vpW - 80);
  });
});

describe('zoomByCenter', () => {
  it('matches the legacy zoomBy math (buttons +/−)', () => {
    const v = zoomByCenter({ x: 100, y: 50, s: 1 }, 1.25, 800, 600);
    expect(v.s).toBeCloseTo(1.25, 10);
    expect(v.x).toBeCloseTo(25, 10);
    expect(v.y).toBeCloseTo(-12.5, 10);
  });

  it('is equivalent to zoomAtPoint anchored at the viewport centre', () => {
    const view = { x: -200, y: 90, s: 0.8 };
    expect(zoomByCenter(view, 1.25, 800, 600)).toEqual(
      zoomAtPoint(view, 1.25, 400, 300, 800, 600),
    );
  });

  it('keeps the viewport centre anchored', () => {
    const view = { x: -200, y: 90, s: 0.8 };
    const before = toWorld(view, 400, 300);
    const after = toWorld(zoomByCenter(view, 1.25, 800, 600), 400, 300);
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
  });
});

describe('beginPinch / pinchView', () => {
  it('snapshots distance, scale and the world point under the midpoint', () => {
    const start = beginPinch(
      { x: 0, y: 0, s: 1 },
      { x: 100, y: 100 },
      { x: 100, y: 200 },
      { x: 100, y: 150 },
    );
    expect(start).toEqual({ dist: 100, s0: 1, wx: 100, wy: 150 });
  });

  it('scales by the distance ratio and keeps the anchor under the midpoint', () => {
    const start = { dist: 100, s0: 1, wx: 300, wy: 200 };
    const next = pinchView(start, 200, 400, 250, 800, 600);
    expect(next.s).toBe(2);
    expect(next.x).toBe(400 - 300 * 2);
    expect(next.y).toBe(250 - 200 * 2);
    const world = toWorld(next, 400, 250);
    expect(world.x).toBeCloseTo(300, 10);
    expect(world.y).toBeCloseTo(200, 10);
  });

  it('clamps the pinch scale at ZOOM_MAX', () => {
    const start = { dist: 10, s0: 2, wx: 0, wy: 0 };
    expect(pinchView(start, 1000, 0, 0, 800, 600).s).toBe(ZOOM_MAX);
  });

  it('clamps the pinch scale at ZOOM_MIN', () => {
    const start = { dist: 100, s0: 0.5, wx: 0, wy: 0 };
    expect(pinchView(start, 50, 0, 0, 800, 600).s).toBe(ZOOM_MIN);
  });
});
