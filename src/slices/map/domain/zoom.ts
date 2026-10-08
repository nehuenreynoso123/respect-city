/**
 * Zoom math: wheel (anchored to cursor), buttons (anchored to viewport
 * centre) and pinch (two-pointer distance → scale, anchored midpoint).
 *
 * Pure port of legacy `zoomBy` (lines ~1545–1560), the wheel listener
 * (~1121–1132) and the pinch handling (~1037–1071).
 */

import { clamp, clampView, toWorld, ZOOM_MAX, ZOOM_MIN } from './view';
import type { Point, View } from './view';

/** Legacy wheel factor: deltaY < 0 zooms in by 1.12, otherwise the inverse. */
export function wheelFactor(deltaY: number): number {
  return deltaY < 0 ? 1.12 : 1 / 1.12;
}

/** Position the view so the world point `anchor` sits at viewport (px, py) with scale `s`. */
function anchoredView(s: number, anchor: Point, px: number, py: number): View {
  return { s, x: px - anchor.x * s, y: py - anchor.y * s };
}

/**
 * Zoom by `factor` keeping the world point under the viewport point (px, py)
 * fixed. Used by the wheel (cursor anchor) — legacy wheel listener math:
 * capture world point → clamp new scale → reposition → clampView.
 */
export function zoomAtPoint(
  view: View,
  factor: number,
  px: number,
  py: number,
  vpW: number,
  vpH: number,
): View {
  const anchor = toWorld(view, px, py);
  const s = clamp(view.s * factor, ZOOM_MIN, ZOOM_MAX);
  return clampView(anchoredView(s, anchor, px, py), vpW, vpH);
}

/** Zoom buttons (+ / −): same math anchored to the viewport centre. Legacy `zoomBy`. */
export function zoomByCenter(view: View, factor: number, vpW: number, vpH: number): View {
  return zoomAtPoint(view, factor, vpW / 2, vpH / 2, vpW, vpH);
}

/** Snapshot taken at two-pointerdown. All points are viewport-relative. */
export interface PinchStart {
  /** Distance between the two pointers at pinch start. */
  dist: number;
  /** Scale at pinch start. */
  s0: number;
  /** World point under the initial midpoint (zoom anchor). */
  wx: number;
  wy: number;
}

/**
 * Snapshot at two-pointerdown: distance, initial scale and the world point
 * under the midpoint. Legacy `pinch = { dist, s0, ...toWorld(mid) }`
 * (distance is translation-invariant, so viewport-relative points are fine).
 */
export function beginPinch(view: View, a: Point, b: Point, mid: Point): PinchStart {
  const anchor = toWorld(view, mid.x, mid.y);
  return {
    dist: Math.hypot(a.x - b.x, a.y - b.y),
    s0: view.s,
    wx: anchor.x,
    wy: anchor.y,
  };
}

/**
 * Two-pointer move: scale by the distance ratio (clamped) and keep the world
 * point captured at pinch start under the current midpoint, then clampView.
 * Legacy pinch math.
 */
export function pinchView(
  start: PinchStart,
  dist: number,
  midX: number,
  midY: number,
  vpW: number,
  vpH: number,
): View {
  const s = clamp(start.s0 * (dist / start.dist), ZOOM_MIN, ZOOM_MAX);
  return clampView({ s, x: midX - start.wx * s, y: midY - start.wy * s }, vpW, vpH);
}
