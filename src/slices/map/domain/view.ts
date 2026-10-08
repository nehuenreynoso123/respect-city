/**
 * Camera view model: world offset (x, y) + scale (s).
 *
 * Pure port of the legacy map section in `legacy/index.html`
 * (`applyView` / `clampView` / `fitView` / `toWorld`, lines ~970–1022).
 * No DOM: viewport dimensions are passed in as plain numbers.
 */

/** World size in px (SVG viewBox). */
export const WORLD_W = 2400;
export const WORLD_H = 1600;

export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 2.6;

/** `fitView` caps the fit scale at 1.2 (legacy literal, below ZOOM_MAX). */
export const FIT_MAX = 1.2;
/** Padding around the island when fitting (legacy `pad`). */
export const FIT_PADDING = 30;
/** Keep at least this many px of the map inside the viewport (legacy `80`). */
export const EDGE_MARGIN = 80;

export interface View {
  /** World offset in viewport px. */
  x: number;
  /** World offset in viewport px. */
  y: number;
  /** Scale: 1 = world pixels. */
  s: number;
}

/** Viewport-relative point (or any 2D point in the caller's space). */
export interface Point {
  x: number;
  y: number;
}

/** Legacy boot view: `ui.view = { x:0, y:0, s:0.65 }` before the first fit. */
export const INITIAL_VIEW: View = { x: 0, y: 0, s: 0.65 };

/** Legacy `clamp` helper. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Keep at least {@link EDGE_MARGIN}px of the map inside the viewport
 * (world spans [x, x + WORLD_W * s]). Legacy `clampView`.
 */
export function clampView(view: View, vpW: number, vpH: number): View {
  const w = WORLD_W * view.s;
  const h = WORLD_H * view.s;
  return {
    s: view.s,
    x: clamp(view.x, EDGE_MARGIN - w, vpW - EDGE_MARGIN),
    y: clamp(view.y, EDGE_MARGIN - h, vpH - EDGE_MARGIN),
  };
}

/** Reset view: fit the whole island centred in the viewport. Legacy `fitView`. */
export function fitView(vpW: number, vpH: number): View {
  const s = clamp(
    Math.min(
      (vpW - FIT_PADDING * 2) / WORLD_W,
      (vpH - FIT_PADDING * 2) / WORLD_H,
    ),
    ZOOM_MIN,
    FIT_MAX,
  );
  return {
    s,
    x: (vpW - WORLD_W * s) / 2,
    y: (vpH - WORLD_H * s) / 2,
  };
}

/** Pan by a screen-space delta, then clamp. */
export function panBy(view: View, dx: number, dy: number, vpW: number, vpH: number): View {
  return clampView({ ...view, x: view.x + dx, y: view.y + dy }, vpW, vpH);
}

/** Convert viewport-relative screen coords → world coords. Legacy `toWorld`. */
export function toWorld(view: View, px: number, py: number): Point {
  return {
    x: (px - view.x) / view.s,
    y: (py - view.y) / view.s,
  };
}
