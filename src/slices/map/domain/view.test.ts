import { describe, expect, it } from 'vitest';

import { clampView, fitView, INITIAL_VIEW, panBy, toWorld, ZOOM_MIN } from './view';

describe('INITIAL_VIEW', () => {
  it('matches the legacy boot view (ui.view default)', () => {
    expect(INITIAL_VIEW).toEqual({ x: 0, y: 0, s: 0.65 });
  });
});

describe('toWorld', () => {
  it('converts viewport coordinates into world coordinates', () => {
    expect(toWorld({ x: 100, y: 50, s: 2 }, 300, 250)).toEqual({ x: 100, y: 100 });
  });

  it('round-trips against the CSS transform', () => {
    const view = { x: -37, y: 118, s: 0.72 };
    const world = toWorld(view, 640, 360);
    expect(world.x * view.s + view.x).toBeCloseTo(640);
    expect(world.y * view.s + view.y).toBeCloseTo(360);
  });
});

describe('clampView', () => {
  const vpW = 800;
  const vpH = 600;

  it('keeps at least 80px of the map inside the viewport', () => {
    // s = 1 → world spans 2400×1600
    expect(clampView({ x: 5000, y: 5000, s: 1 }, vpW, vpH)).toEqual({ x: 720, y: 520, s: 1 });
    expect(clampView({ x: -9999, y: -9999, s: 1 }, vpW, vpH)).toEqual({ x: -2320, y: -1520, s: 1 });
  });

  it('leaves an in-range view untouched', () => {
    const view = { x: 100, y: 50, s: 1 };
    expect(clampView(view, vpW, vpH)).toEqual(view);
  });

  it('clamps against the scaled world size', () => {
    // s = 0.5 → world spans 1200×800
    expect(clampView({ x: -5000, y: -5000, s: 0.5 }, vpW, vpH)).toEqual({
      x: -1120,
      y: -720,
      s: 0.5,
    });
  });
});

describe('fitView', () => {
  it('centres the island with 30px padding (legacy fitView)', () => {
    const s = 940 / 2400; // (1000 - 60) / 2400 beats (700 - 60) / 1600
    const v = fitView(1000, 700);
    expect(v.s).toBeCloseTo(s, 10);
    expect(v.x).toBeCloseTo((1000 - 2400 * s) / 2, 10);
    expect(v.y).toBeCloseTo((700 - 1600 * s) / 2, 10);
  });

  it('keeps the island centred in the viewport', () => {
    const v = fitView(1366, 768);
    expect(v.x + (2400 * v.s) / 2).toBeCloseTo(1366 / 2, 10);
    expect(v.y + (1600 * v.s) / 2).toBeCloseTo(768 / 2, 10);
  });

  it('clamps the fit scale to ZOOM_MIN on tiny viewports', () => {
    const v = fitView(200, 150);
    expect(v.s).toBe(ZOOM_MIN);
    expect(v.x).toBeCloseTo((200 - 2400 * ZOOM_MIN) / 2, 10);
    expect(v.y).toBeCloseTo((150 - 1600 * ZOOM_MIN) / 2, 10);
  });

  it('never exceeds 1.2 even on huge viewports (legacy fit cap)', () => {
    expect(fitView(10000, 8000).s).toBe(1.2);
  });
});

describe('panBy', () => {
  it('applies the delta on top of the given view', () => {
    expect(panBy({ x: 10, y: 20, s: 1 }, 100, -50, 800, 600)).toEqual({
      x: 110,
      y: -30,
      s: 1,
    });
  });

  it('clamps the panned view', () => {
    expect(panBy({ x: 0, y: 0, s: 1 }, 9000, -9000, 800, 600)).toEqual({
      x: 720,
      y: -1520,
      s: 1,
    });
  });
});
