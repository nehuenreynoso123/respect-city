/**
 * Marker layer model: world positions + counter-scale.
 *
 * Markers live inside the scaled `#world` layer, so each pin carries
 * `scale(var(--inv))` in CSS where `--inv = 1 / view.s` — pins keep a
 * constant screen size at any zoom (legacy `applyView`, line ~990).
 */

import type { View } from './view';

/**
 * Minimal marker data the map renders. Shaped at the app root from mission
 * data (the map slice does not import other slices).
 */
export interface MapMarker {
  id: string;
  /** World coordinates (px) inside the 2400×1600 island. */
  x: number;
  y: number;
  title: string;
  /** Category key, used for the `cat-*` accent class. */
  category: string;
  /** Category icon (emoji) shown in the pin chip. */
  icon: string;
  done: boolean;
}

export interface MarkerLayer {
  markers: readonly MapMarker[];
  /** Counter-scale (1 / view.s): pins stay a constant screen size while the world scales. */
  invScale: number;
}

/** Build the marker layer model for the current camera view. */
export function markerLayer(markers: readonly MapMarker[], view: View): MarkerLayer {
  return { markers, invScale: 1 / view.s };
}
