import { extrudeRect, type Footprint } from '../domain/extrusion';

interface Building {
  id: string;
  footprint: Footprint;
  depth: number;
  palette: 'cyan' | 'pink' | 'gold';
}

interface FaceColors {
  front: string;
  right: string;
  accent: string;
}

const PALETTES: Record<Building['palette'], FaceColors> = {
  cyan: { front: '#06323c', right: '#0a5260', accent: '#00f3ff' },
  pink: { front: '#3d0524', right: '#6b0a3c', accent: '#ff007f' },
  gold: { front: '#3a2f05', right: '#63510a', accent: '#ffd700' },
};

/**
 * Footprints of the original flat building layer, grouped by district.
 * Kept in source order here; render order is sorted by depth on screen.
 */
export const BUILDINGS: readonly Building[] = [
  // Downtown (cyan)
  { id: 'downtown-1', footprint: { x: 980, y: 600, w: 90, h: 70 }, depth: 120, palette: 'cyan' },
  { id: 'downtown-2', footprint: { x: 1090, y: 585, w: 70, h: 90 }, depth: 150, palette: 'cyan' },
  { id: 'downtown-3', footprint: { x: 1180, y: 620, w: 95, h: 62 }, depth: 100, palette: 'cyan' },
  { id: 'downtown-4', footprint: { x: 1005, y: 760, w: 80, h: 80 }, depth: 130, palette: 'cyan' },
  { id: 'downtown-5', footprint: { x: 1120, y: 785, w: 110, h: 65 }, depth: 110, palette: 'cyan' },
  // Beach hotels (pink)
  { id: 'beach-hotel-1', footprint: { x: 1930, y: 500, w: 90, h: 60 }, depth: 110, palette: 'pink' },
  { id: 'beach-hotel-2', footprint: { x: 2040, y: 560, w: 75, h: 85 }, depth: 140, palette: 'pink' },
  { id: 'beach-hotel-3', footprint: { x: 1905, y: 640, w: 100, h: 55 }, depth: 95, palette: 'pink' },
  { id: 'beach-hotel-4', footprint: { x: 1940, y: 1030, w: 90, h: 70 }, depth: 120, palette: 'pink' },
  { id: 'beach-hotel-5', footprint: { x: 2050, y: 1090, w: 80, h: 90 }, depth: 135, palette: 'pink' },
  // Starfish Isle mansions (gold)
  { id: 'starfish-mansion-1', footprint: { x: 1580, y: 800, w: 60, h: 46 }, depth: 60, palette: 'gold' },
  { id: 'starfish-mansion-2', footprint: { x: 1660, y: 835, w: 52, h: 40 }, depth: 55, palette: 'gold' },
  // Prawn Island soundstages (gold)
  { id: 'prawn-stage-1', footprint: { x: 1272, y: 556, w: 52, h: 34 }, depth: 50, palette: 'gold' },
  { id: 'prawn-stage-2', footprint: { x: 1340, y: 578, w: 46, h: 30 }, depth: 45, palette: 'gold' },
  { id: 'prawn-stage-3', footprint: { x: 1298, y: 622, w: 58, h: 28 }, depth: 48, palette: 'gold' },
  // Viceport warehouses (gold)
  { id: 'viceport-warehouse-1', footprint: { x: 820, y: 1150, w: 70, h: 40 }, depth: 45, palette: 'gold' },
  { id: 'viceport-warehouse-2', footprint: { x: 905, y: 1165, w: 54, h: 34 }, depth: 40, palette: 'gold' },
];

/**
 * Fake isometric depth for the city buildings, drawn as plain SVG.
 *
 * `extrudeRect` lifts each footprint up-left and returns a top face plus the
 * visible south and east walls. This is a visual trick only: no 3D transform,
 * no camera change, and the world stays in the same 2400x1600 coordinate space.
 */
export function ExtrudedCity() {
  // Sort a copy so the exported array stays grouped by district in source order.
  const backToFront = [...BUILDINGS].sort(
    (a, b) => a.footprint.y - b.footprint.y,
  );

  return (
    <g id="extruded-city">
      {backToFront.map((building) => {
        const faces = extrudeRect(building.footprint, building.depth);
        const colors = PALETTES[building.palette];
        const { x, y, w, h } = building.footprint;

        return (
          <g key={building.id}>
            {/* Ground shadow: offset down/right so each prism feels seated. */}
            <rect
              x={x + 8}
              y={y + 10}
              width={w}
              height={h}
              rx={4}
              fill="#02040f"
              fillOpacity=".4"
            />
            <path
              d={faces.front}
              fill={colors.front}
              fillOpacity=".78"
              stroke={colors.accent}
              strokeOpacity=".18"
              strokeWidth="1"
            />
            <path
              d={faces.right}
              fill={colors.right}
              fillOpacity=".72"
              stroke={colors.accent}
              strokeOpacity=".18"
              strokeWidth="1"
            />
            <path
              d={faces.top}
              fill={colors.accent}
              fillOpacity=".14"
              stroke={colors.accent}
              strokeOpacity=".9"
              strokeWidth="2"
            />
          </g>
        );
      })}
    </g>
  );
}
