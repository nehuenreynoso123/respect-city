/**
 * Pure 2.5D extrusion geometry for SVG buildings.
 *
 * A rectangular footprint on the ground plus a visual height (`depth`) becomes
 * three SVG polygons: a top face and the two visible side walls (south and
 * east). The top face is the base rect translated by a constant lift vector —
 * this is fake isometric depth in a top-down SVG, not a real 3D transform.
 * No React, no DOM: the output is plain path `d` strings.
 */

/** Base rectangle on the ground, in world px. */
export interface Footprint {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Direction the top face is shifted, as a fraction of `depth`. */
export interface Lift {
  x: number;
  y: number;
}

/** SVG path `d` strings for the three visible faces of the prism. */
export interface ExtrusionFaces {
  top: string;
  front: string;
  right: string;
}

/** Up-left lift: exposes the south (`front`) and east (`right`) walls. */
export const DEFAULT_LIFT: Lift = { x: -0.30, y: -0.55 };

/** Emitted numbers keep two decimals so path strings never carry float noise. */
const DECIMALS = 2;

interface Vertex {
  x: number;
  y: number;
}

/** Round to the emitted precision and normalise `-0` to `0`. */
function round(value: number): number {
  const factor = 10 ** DECIMALS;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Build a closed SVG path (`M … L … Z`) from its vertices. */
function closedPath(vertices: readonly Vertex[]): string {
  const [first, ...rest] = vertices;
  const moves = `M ${round(first.x)} ${round(first.y)}`;
  const lines = rest.map((v) => ` L ${round(v.x)} ${round(v.y)}`).join('');
  return `${moves}${lines} Z`;
}

/**
 * Extrude a ground rectangle into three visible faces.
 *
 * The top face is the base rect translated by `lift * depth`. With the default
 * lift it moves up-left, revealing the south wall (`front`) and east wall
 * (`right`). `depth` must be finite and non-negative; `0` yields a flat top
 * equal to the base rect and two degenerate (still closed) walls. Inputs are
 * never mutated.
 */
export function extrudeRect(
  footprint: Footprint,
  depth: number,
  lift: Lift = DEFAULT_LIFT,
): ExtrusionFaces {
  if (!Number.isFinite(depth) || depth < 0) {
    throw new RangeError(
      `extrudeRect: depth must be a finite number >= 0, received ${depth}`,
    );
  }

  const { x, y, w, h } = footprint;
  const lx = lift.x * depth;
  const ly = lift.y * depth;

  return {
    top: closedPath([
      { x: x + lx, y: y + ly },
      { x: x + w + lx, y: y + ly },
      { x: x + w + lx, y: y + h + ly },
      { x: x + lx, y: y + h + ly },
    ]),
    front: closedPath([
      { x, y: y + h },
      { x: x + w, y: y + h },
      { x: x + w + lx, y: y + h + ly },
      { x: x + lx, y: y + h + ly },
    ]),
    right: closedPath([
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x: x + w + lx, y: y + h + ly },
      { x: x + w + lx, y: y + ly },
    ]),
  };
}
