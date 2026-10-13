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
 * Interactive synthwave city map. Original artwork (not derived from any game
 * asset) shaped after the Vice City layout everyone recognises: two landmasses
 * split by a central bay, a long beach island on the east with the ocean
 * beyond, and a small mansion island (Starfish-like) in the middle of the bay.
 * Everything lives in the `2400×1600` world that the camera math assumes.
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
            {/* Beach sand (ocean edge of the eastern island) */}
            <linearGradient id="sand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5a527e" />
              <stop offset="1" stopColor="#3b3568" />
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
          <rect width="2400" height="1600" fill="url(#waves)" opacity=".5" />

          {/* Synthwave sunset over the ocean, north-east horizon */}
          <g opacity=".85" transform="translate(2050,155)">
            <circle r="120" fill="url(#sun)" opacity=".9" />
            <rect y="-10" width="240" height="10" fill="#0a1130" />
            <rect y="20" width="240" height="14" fill="#0a1130" />
            <rect y="55" width="240" height="18" fill="#0a1130" />
          </g>

          {/* === MAINLAND (west + centre): Downtown, Little Havana, Little Haiti === */}
          <path
            d="M150 320
                 C210 150 520 120 780 210
                 C1010 285 1150 355 1200 505
                 C1238 610 1220 685 1150 750
                 C1100 800 1075 880 1055 985
                 C1035 1120 1000 1250 890 1340
                 C700 1435 440 1415 290 1305
                 C170 1215 108 880 128 620
                 C136 500 130 400 150 320 Z"
            fill="url(#land)"
            stroke="#00f3ff"
            strokeWidth="5"
            strokeOpacity=".65"
          />

          {/* === STARFISH ISLE — mansion island in the middle of the bay === */}
          <ellipse
            cx="1620"
            cy="840"
            rx="165"
            ry="125"
            fill="url(#land)"
            stroke="#ffd700"
            strokeWidth="4"
            strokeOpacity=".7"
          />

          {/* === VICE BEACH — long eastern island, ocean on its far side === */}
          <path
            d="M1920 250
                 C2050 235 2145 325 2160 480
                 C2178 645 2165 800 2150 985
                 C2133 1175 2088 1332 1968 1432
                 C1878 1500 1768 1472 1744 1350
                 C1724 1232 1766 1080 1794 940
                 C1818 800 1806 660 1798 520
                 C1790 388 1818 288 1920 250 Z"
            fill="url(#land)"
            stroke="#00f3ff"
            strokeWidth="5"
            strokeOpacity=".65"
          />
          {/* Beach sand strip along the ocean edge */}
          <path
            d="M2160 480
                 C2178 645 2165 800 2150 985
                 C2133 1175 2088 1332 1968 1432
                 L2006 1330
                 C2046 1170 2058 990 2062 820
                 C2066 665 2058 560 2045 505 Z"
            fill="url(#sand)"
            fillOpacity=".5"
          />

          {/* === CAUSEWAYS / BRIDGES: mainland → starfish → beach === */}
          <g stroke="#2c3568" strokeWidth="20" strokeLinecap="round">
            <line x1="1120" y1="760" x2="1470" y2="820" /> {/* mainland → starfish */}
            <line x1="1775" y1="840" x2="1808" y2="840" /> {/* starfish → beach */}
            <line x1="1080" y1="540" x2="1820" y2="430" /> {/* northern causeway */}
            <line x1="900" y1="1320" x2="1800" y2="1340" /> {/* southern causeway */}
          </g>
          <g
            stroke="#ffd700"
            strokeWidth="3"
            strokeOpacity=".55"
            strokeDasharray="18 14"
            strokeLinecap="round"
          >
            <line x1="1080" y1="540" x2="1820" y2="430" />
            <line x1="900" y1="1320" x2="1800" y2="1340" />
            <line x1="1120" y1="760" x2="1470" y2="820" />
          </g>

          {/* === DISTRICT LABELS === */}
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
            <ellipse cx="1000" cy="660" rx="300" ry="220" fill="#00f3ff" fillOpacity=".07" />
            <text x="1000" y="560" fill="#00f3ff">
              DOWNTOWN
            </text>
            {/* Vice Beach */}
            <text x="1965" y="470" fill="#ff007f">
              VICE BEACH
            </text>
            {/* Ocean Beach (south beach strip) */}
            <text x="1975" y="1120" fill="#ff007f" fontSize="36" fillOpacity=".75">
              OCEAN BEACH
            </text>
            {/* Little Havana */}
            <ellipse cx="430" cy="1000" rx="250" ry="200" fill="#ffd700" fillOpacity=".07" />
            <text x="430" y="1010" fill="#ffd700" fontSize="40">
              LITTLE HAVANA
            </text>
            {/* Little Haiti */}
            <text x="520" y="360" fill="#00f3ff" fontSize="38" fillOpacity=".7">
              LITTLE HAITI
            </text>
            {/* The Docks */}
            <text x="700" y="1255" fill="#ffd700" fontSize="36" fillOpacity=".7">
              THE DOCKS
            </text>
            {/* Starfish Isle */}
            <text x="1620" y="852" fill="#ffd700" fontSize="30" fillOpacity=".85">
              STARFISH ISLE
            </text>
          </g>

          {/* === MAINLAND ROADS === */}
          <g fill="none" stroke="#2c3568" strokeWidth="22" strokeLinecap="round" strokeOpacity=".9">
            <path d="M300 900 C600 850 900 905 1120 800" /> {/* main east-west */}
            <path d="M780 240 C825 500 770 770 700 1130" /> {/* main north-south */}
            <path d="M330 600 C520 640 625 760 645 1000" /> {/* havana loop */}
            <path d="M980 420 C1005 540 995 620 1000 730" /> {/* downtown grid */}
          </g>
          <g
            fill="none"
            stroke="#ffd700"
            strokeWidth="3"
            strokeOpacity=".5"
            strokeDasharray="22 18"
            strokeLinecap="round"
          >
            <path d="M300 900 C600 850 900 905 1120 800" />
            <path d="M780 240 C825 500 770 770 700 1130" />
          </g>

          {/* === BEACH ROAD (runs the length of the eastern island) === */}
          <g fill="none" stroke="#2c3568" strokeWidth="16" strokeLinecap="round" strokeOpacity=".9">
            <path d="M1900 330 C1932 560 1900 820 1882 1080 C1872 1235 1860 1320 1842 1382" />
          </g>

          {/* === BUILDING BLOCKS: downtown (cyan) === */}
          <g fill="#00f3ff" fillOpacity=".10" stroke="#00f3ff" strokeOpacity=".25" strokeWidth="2">
            <rect x="980" y="600" width="90" height="70" rx="4" />
            <rect x="1090" y="585" width="70" height="90" rx="4" />
            <rect x="1180" y="620" width="95" height="62" rx="4" />
            <rect x="1005" y="760" width="80" height="80" rx="4" />
            <rect x="1120" y="785" width="110" height="65" rx="4" />
          </g>
          {/* === BUILDING BLOCKS: beach hotels (pink) === */}
          <g fill="#ff007f" fillOpacity=".10" stroke="#ff007f" strokeOpacity=".25" strokeWidth="2">
            <rect x="1930" y="500" width="90" height="60" rx="4" />
            <rect x="2040" y="560" width="75" height="85" rx="4" />
            <rect x="1905" y="640" width="100" height="55" rx="4" />
            <rect x="1940" y="1030" width="90" height="70" rx="4" />
            <rect x="2050" y="1090" width="80" height="90" rx="4" />
          </g>
          {/* === MANSIONS on Starfish Isle === */}
          <g fill="#ffd700" fillOpacity=".12" stroke="#ffd700" strokeOpacity=".3" strokeWidth="2">
            <rect x="1580" y="800" width="60" height="46" rx="4" />
            <rect x="1660" y="835" width="52" height="40" rx="4" />
          </g>

          {/* PALMS (simple stylised) */}
          <g stroke="#3dff8a" strokeWidth="4" fill="none" strokeOpacity=".7">
            <g transform="translate(2000,700)">
              <path d="M0 0 L0 -34" />
              <path d="M0 -34 q-20 -12 -34 -6" />
              <path d="M0 -34 q20 -12 34 -6" />
              <path d="M0 -34 q-6 -22 -20 -28" />
              <path d="M0 -34 q8 -20 24 -24" />
            </g>
            <g transform="translate(1950,1200)">
              <path d="M0 0 L0 -34" />
              <path d="M0 -34 q-20 -12 -34 -6" />
              <path d="M0 -34 q20 -12 34 -6" />
              <path d="M0 -34 q-6 -22 -20 -28" />
              <path d="M0 -34 q8 -20 24 -24" />
            </g>
            <g transform="translate(1580,880)">
              <path d="M0 0 L0 -34" />
              <path d="M0 -34 q-20 -12 -34 -6" />
              <path d="M0 -34 q20 -12 34 -6" />
              <path d="M0 -34 q-6 -22 -20 -28" />
              <path d="M0 -34 q8 -20 24 -24" />
            </g>
            <g transform="translate(500,1060)">
              <path d="M0 0 L0 -34" />
              <path d="M0 -34 q-20 -12 -34 -6" />
              <path d="M0 -34 q20 -12 34 -6" />
              <path d="M0 -34 q-6 -22 -20 -28" />
              <path d="M0 -34 q8 -20 24 -24" />
            </g>
            <g transform="translate(1020,1150)">
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
