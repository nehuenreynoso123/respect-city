import { useEffect, type CSSProperties } from 'react';

import { useMapCamera } from '../application/useMapCamera';
import { markerLayer, type MapMarker } from '../domain/markers';
import { toWorld as toWorldDomain, type Point } from '../domain/view';

export interface CityMapProps {
  /** Markers to render (shaped at the app root from mission data). */
  markers: readonly MapMarker[];
  /** Legacy markers click → openPanel(id). */
  onMarkerClick?: (id: string) => void;
  /** Legacy handleMapTap (world coords) — pick mode / create modal, wired in T7. */
  onMapTap?: (world: Point) => void;
  /** Legacy `.pick-mode` class on the viewport (crosshair cursor). */
  pickMode?: boolean;
  /**
   * Receives a getter returning the world point at the viewport center
   * (legacy `openCreateModal(toWorld(center))` for `#btn-new`). The getter
   * is refreshed on every camera change so callers can store it safely.
   */
  onRequestDefaultLocation?: (getter: () => Point | null) => void;
}

/**
 * Interactive Vice City map. The SVG is copied verbatim from
 * `legacy/index.html` (lines 552–672), plus the HTML markers overlay
 * (counter-scaled via `--inv` so pins keep a constant screen size) and
 * the map furniture (hint + zoom controls).
 */
export function CityMap({
  markers,
  onMarkerClick,
  onMapTap,
  pickMode,
  onRequestDefaultLocation,
}: CityMapProps) {
  const camera = useMapCamera({ onMapTap });
  const layer = markerLayer(markers, camera.view);

  // Same two writes as legacy applyView(): transform + counter-scale var.
  const worldStyle = {
    transform: `translate(${camera.view.x}px, ${camera.view.y}px) scale(${camera.view.s})`,
    '--inv': String(layer.invScale),
  } as CSSProperties;

  // Push a viewport-center getter bound to the current view (legacy `#btn-new`).
  useEffect(() => {
    onRequestDefaultLocation?.(() => {
      const vp = camera.viewportRef.current;
      if (!vp) return null;
      return toWorldDomain(camera.view, vp.clientWidth / 2, vp.clientHeight / 2);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.view, onRequestDefaultLocation]);

  return (
    <div
      id="map-viewport"
      className={`${camera.dragging ? 'dragging ' : ''}${pickMode ? 'pick-mode' : ''}`}
      ref={camera.viewportRef}
      onPointerDown={camera.onPointerDown}
      onPointerMove={camera.onPointerMove}
      onPointerUp={camera.onPointerUp}
      onPointerCancel={camera.onPointerCancel}
    >
      <div id="world" style={worldStyle}>
        <svg id="city-map" viewBox="0 0 2400 1600" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Ocean gradient */}
            <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a1130" />
              <stop offset="1" stopColor="#050a1d" />
            </linearGradient>
            {/* Land gradient */}
            <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1a2147" />
              <stop offset="1" stopColor="#121632" />
            </linearGradient>
            {/* Synthwave sun */}
            <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd700" />
              <stop offset="1" stopColor="#ff007f" />
            </linearGradient>
            <pattern id="waves" width="120" height="60" patternUnits="userSpaceOnUse">
              <path d="M0 30 q30 -12 60 0 t60 0" fill="none" stroke="#12205a" strokeWidth="2" />
            </pattern>
          </defs>

          {/* OPEN SEA */}
          <rect width="2400" height="1600" fill="url(#sea)" />
          <rect width="2400" height="1600" fill="url(#waves)" opacity=".55" />

          {/* Decorative synthwave sun (top-right, over the water) */}
          <g opacity=".8" transform="translate(2060,170)">
            <circle r="120" fill="url(#sun)" opacity=".9" />
            <rect y="-10" width="240" height="10" fill="#0a1130" />
            <rect y="20" width="240" height="14" fill="#0a1130" />
            <rect y="55" width="240" height="18" fill="#0a1130" />
            <rect y="95" width="240" height="24" fill="#0a1130" />
          </g>

          {/* MAIN ISLAND */}
          <path
            d="M320 780
                 C360 520 620 340 920 300
                 C1160 268 1340 380 1560 350
                 C1860 310 2140 440 2200 680
                 C2255 900 2120 1140 1900 1240
                 C1700 1330 1480 1275 1240 1325
                 C980 1380 720 1350 520 1210
                 C360 1095 285 950 320 780 Z"
            fill="url(#land)"
            stroke="#00f3ff"
            strokeWidth="5"
            strokeOpacity=".65"
          />

          {/* ZONES (translucent neon districts) */}
          <g
            fontFamily="Bungee, sans-serif"
            fontSize="46"
            fill="#00f3ff"
            fillOpacity=".85"
            letterSpacing="6"
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            {/* Downtown */}
            <ellipse cx="1240" cy="760" rx="330" ry="240" fill="#00f3ff" fillOpacity=".07" />
            <text x="1240" y="770" fill="#00f3ff">
              DOWNTOWN
            </text>
            {/* Vice Beach */}
            <path
              d="M1720 380 C1960 360 2150 500 2170 700 L1750 760 Z"
              fill="#ff007f"
              fillOpacity=".08"
            />
            <text x="1950" y="560" fill="#ff007f">
              VICE BEACH
            </text>
            {/* Little Havana */}
            <ellipse cx="640" cy="700" rx="260" ry="210" fill="#ffd700" fillOpacity=".07" />
            <text x="640" y="710" fill="#ffd700" fontSize="40">
              LITTLE HAVANA
            </text>
            {/* North Point */}
            <text x="1000" y="430" fill="#00f3ff" fontSize="36" fillOpacity=".7">
              NORTH POINT
            </text>
            {/* The Docks */}
            <text x="800" y="1200" fill="#ffd700" fontSize="36" fillOpacity=".7">
              THE DOCKS
            </text>
            {/* South Beach (small island) */}
            <text x="1950" y="1480" fill="#ff007f" fontSize="34" fillOpacity=".75">
              SOUTH BEACH
            </text>
          </g>

          {/* ROADS */}
          <g fill="none" stroke="#2c3568" strokeWidth="26" strokeLinecap="round">
            <path d="M420 760 C800 700 1300 780 2140 700" /> {/* main east-west */}
            <path d="M1180 330 C1230 600 1170 950 1240 1300" /> {/* main north-south */}
            <path d="M560 460 C760 640 900 900 840 1290" /> {/* havana loop */}
            <path d="M1620 400 C1680 700 1840 950 1740 1240" /> {/* beach avenue */}
            <path d="M420 1040 C900 1120 1500 1060 2060 1140" /> {/* southern ring */}
            <path d="M760 340 C980 480 1500 470 1900 640" /> {/* northern diag */}
          </g>
          {/* Road centre dashes (gold) */}
          <g
            fill="none"
            stroke="#ffd700"
            strokeWidth="3"
            strokeOpacity=".55"
            strokeDasharray="22 18"
            strokeLinecap="round"
          >
            <path d="M420 760 C800 700 1300 780 2140 700" />
            <path d="M1180 330 C1230 600 1170 950 1240 1300" />
            <path d="M560 460 C760 640 900 900 840 1290" />
          </g>

          {/* SMALL SOUTH ISLAND + BRIDGE */}
          <path
            d="M1650 1430 C1780 1370 2140 1370 2260 1450
                 C2330 1500 2320 1580 2230 1600
                 L1650 1600 C1580 1560 1580 1470 1650 1430 Z"
            fill="url(#land)"
            stroke="#00f3ff"
            strokeWidth="4"
            strokeOpacity=".55"
          />
          <path d="M1500 1330 L1660 1440" stroke="#2c3568" strokeWidth="22" strokeLinecap="round" />
          <path
            d="M1500 1330 L1660 1440"
            stroke="#ffd700"
            strokeWidth="3"
            strokeDasharray="16 12"
            strokeOpacity=".6"
          />

          {/* BUILDING BLOCKS (downtown texture) */}
          <g fill="#00f3ff" fillOpacity=".10" stroke="#00f3ff" strokeOpacity=".25" strokeWidth="2">
            <rect x="1080" y="620" width="90" height="70" rx="4" />
            <rect x="1200" y="600" width="70" height="90" rx="4" />
            <rect x="1310" y="640" width="100" height="60" rx="4" />
            <rect x="1120" y="830" width="80" height="80" rx="4" />
            <rect x="1260" y="850" width="110" height="65" rx="4" />
          </g>
          <g fill="#ff007f" fillOpacity=".10" stroke="#ff007f" strokeOpacity=".25" strokeWidth="2">
            <rect x="1880" y="640" width="90" height="60" rx="4" />
            <rect x="2000" y="700" width="75" height="85" rx="4" />
            <rect x="1830" y="760" width="100" height="55" rx="4" />
          </g>

          {/* PALMS (simple stylised) */}
          <g stroke="#3dff8a" strokeWidth="4" fill="none" strokeOpacity=".7">
            <g transform="translate(480,560)">
              <path d="M0 0 L0 -34" />
              <path d="M0 -34 q-20 -12 -34 -6" />
              <path d="M0 -34 q20 -12 34 -6" />
              <path d="M0 -34 q-6 -22 -20 -28" />
              <path d="M0 -34 q8 -20 24 -24" />
            </g>
            <g transform="translate(2100,880)">
              <path d="M0 0 L0 -34" />
              <path d="M0 -34 q-20 -12 -34 -6" />
              <path d="M0 -34 q20 -12 34 -6" />
              <path d="M0 -34 q-6 -22 -20 -28" />
              <path d="M0 -34 q8 -20 24 -24" />
            </g>
            <g transform="translate(980,1150)">
              <path d="M0 0 L0 -34" />
              <path d="M0 -34 q-20 -12 -34 -6" />
              <path d="M0 -34 q20 -12 34 -6" />
              <path d="M0 -34 q-6 -22 -20 -28" />
              <path d="M0 -34 q8 -20 24 -24" />
            </g>
            <g transform="translate(1750,470)">
              <path d="M0 0 L0 -34" />
              <path d="M0 -34 q-20 -12 -34 -6" />
              <path d="M0 -34 q20 -12 34 -6" />
              <path d="M0 -34 q-6 -22 -20 -28" />
              <path d="M0 -34 q8 -20 24 -24" />
            </g>
          </g>

          {/* COMPASS */}
          <g transform="translate(2280,1520)" fontFamily="Bungee, sans-serif" textAnchor="middle">
            <circle r="44" fill="rgba(0,0,0,.5)" stroke="#00f3ff" strokeWidth="3" strokeOpacity=".7" />
            <path d="M0 -30 L10 8 L0 2 L-10 8 Z" fill="#ff007f" />
            <text y="-46" fontSize="26" fill="#00f3ff">
              N
            </text>
          </g>
        </svg>

        {/* HTML markers layer (rendered by JS) */}
        <div id="markers">
          {layer.markers.map((m) => (
            <div
              key={m.id}
              className={`marker cat-${m.category}${m.done ? ' done' : ''}`}
              data-id={m.id}
              style={{ left: m.x, top: m.y }}
              title={m.title}
              onClick={() => onMarkerClick?.(m.id)}
            >
              <div className="marker-chip">
                <span>{m.icon}</span>
              </div>
              <div className="marker-tag">{m.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div id="map-hint">{pickMode ? 'Tap the map to set the mission location' : 'Click anywhere on the map to add a mission'}</div>
      <div id="zoom-controls">
        <button id="zoom-in" title="Zoom in" onClick={camera.zoomIn}>
          +
        </button>
        <button id="zoom-out" title="Zoom out" onClick={camera.zoomOut}>
          −
        </button>
        <button id="zoom-fit" title="Reset view" onClick={camera.fit}>
          ⌂
        </button>
      </div>
    </div>
  );
}
