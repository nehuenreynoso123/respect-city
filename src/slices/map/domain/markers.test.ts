import { describe, expect, it } from 'vitest';

import { markerLayer, type MapMarker } from './markers';

const markers: MapMarker[] = [
  { id: 'm1', x: 120, y: 340, title: 'Push-ups', category: 'gym', icon: '💪', done: false },
  { id: 'm2', x: 900, y: 700, title: 'Ship feature', category: 'code', icon: '💻', done: true },
];

describe('markerLayer', () => {
  it('counter-scales with the inverse of the zoom (constant screen size)', () => {
    expect(markerLayer(markers, { x: 0, y: 0, s: 0.5 }).invScale).toBe(2);
    expect(markerLayer(markers, { x: 0, y: 0, s: 2 }).invScale).toBe(0.5);
    expect(markerLayer(markers, { x: 0, y: 0, s: 0.35 }).invScale).toBeCloseTo(1 / 0.35, 10);
  });

  it('passes the marker positions through untouched', () => {
    const layer = markerLayer(markers, { x: -10, y: 20, s: 1 });
    expect(layer.markers).toBe(markers);
  });
});
