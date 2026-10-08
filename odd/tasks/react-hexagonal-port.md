# ODD — react-hexagonal-port

**Feature**: port de `index.html` (mock vanilla) a React + TypeScript con arquitectura hexagonal y vertical slicing.
**Creado**: 2026-10-08 · **Rama**: `feat/react-hexagonal-port` (desde `master`)

## Objetivo

Reescribir la app existente en React + TS con arquitectura hexagonal organizada por
slices verticales, reutilizando el 100% de las funcionalidades actuales. Sin features
nuevas: el resultado debe comportarse igual que el HTML.

## Problema / Por qué

`index.html` es un monolito de 1479 líneas (lógica, estado, persistencia, audio, mapa
SVG y UI mezclados en un `<script>`). Sirve como prototipo, pero cada cambio requiere
releer todo el archivo y nada es testeable. El objetivo declarado por el usuario es
escalarlo como proyecto de portfolio y practicar para empleo.

## Alcance

**IN**
- Parity total con el HTML (ver criteria abajo).
- Arquitectura hexagonal (dominio / puertos / adaptadores) + vertical slicing.
- Vite + React + TS estricto.
- Tests sobre lógica pura (dominio, recompensas, reducer, storage).
- `typecheck` + `build` + `test` como gate de verificación.

**OUT** (siguiente iteración, no ahora)
- Reset diario de la rutina, historial, rachas (`completions[fecha]`).
- Backend/API, auth, sincronización.
- Deploy, PWA, i18n, README de portfolio.

## Restricciones

1. **Compatibilidad de datos**: leer el formato existente de `localStorage`
   (`vice-tasks:v1`) tal cual. Los datos ya guardados del usuario deben cargarse
   sin pérdida y con `routineSeeded` preservado.
2. **SVG del mapa textual**: `CityMap.tsx` copia el SVG del HTML sin redibujarlo.
3. **Dependencias**: `react`, `react-dom`, `vite`, `typescript`, `vitest`,
   `@vitejs/plugin-react`. Sin router, sin Redux/Zustand, sin UI kit.
4. **TDD: off** — no hay configuración TDD en el proyecto ni elección explícita.
   Tests escritos junto con cada slice sobre lógica pura (no strict RED/GREEN).
5. **RDD: off** (`gentle-ai review mode status` → off by default) → verificación
   ordinaria: `typecheck` + `build` + `test` + lectura estructural de paridad.
6. **`index.html` pasa a `legacy/index.html`** en T1: Vite necesita la raíz para su
   propio `index.html`. El HTML queda como spec de referencia y chequeo de paridad.

## Arquitectura objetivo

Hexagonal + slices verticales: cada slice es una función vertical del negocio y
adentro respeta dominio → puertos → adaptadores → UI.

```
src/
  app/                        # raíz de composición (driving adapter principal)
    main.tsx
    App.tsx
    store/AppProvider.tsx     # useReducer + inyección de adaptadores
  slices/
    mission/
      domain/                 # Mission, ChecklistItem, missionDone, recompensas
      application/            # reducer + comandos
      ports/                  # MissionRepository (interfaz)
      adapters/               # LocalStorageMissionRepository
      ui/                     # MissionList, MissionPanel, CreateMissionModal
      routine.ts              # ROUTINE_MISSIONS + merge por versión
    player/
      domain/                 # exp, nivel, coins, stats
      application/
      ui/                     # HUD
    map/
      domain/                 # view model de cámara (x, y, s) + clamp
      application/            # useMapCamera
      ui/                     # CityMap (SVG verbatim), Markers
    audio/
      ports/                  # SfxPort
      adapters/               # WebAudioSfxAdapter
    storage/
      ports/                  # StoragePort
      adapters/               # LocalStorageAdapter con versionado
  shared/ui/                  # Checkbox, Bar, botones arcade
```

Reglas:
- El dominio y el application no importan de React ni de `localStorage` ni de la Web Audio API.
- React vive solo en `ui/` y `app/`.
- El estado global es **un** `useReducer` en `AppProvider`; los adaptadores se
  inyectan ahí (no se importan desde el dominio).

## Tareas

- [ ] **T1 — Scaffold**: mover `index.html` → `legacy/index.html`; `npm create vite`
      (react-ts); strict; alias `@/`; scripts `dev|build|test|typecheck`; esqueleto de
      carpetas por slice.
      *Check*: `npm run typecheck && npm run build`
- [ ] **T2 — Dominio**: tipos `Mission`/`ChecklistItem`/`Player`; `missionDone`;
      regla de recompensas (exp, coins, stat +8, `rewardGranted` una sola vez);
      cálculo de nivel/EXP; `ROUTINE_MISSIONS` + `seedMissions` + `mergeRoutine`.
      *Check*: `npm test` (casos: primera recompensa, re-tildar no re-paga, nivel,
      merge no duplica)
- [ ] **T3 — Puertos + adaptadores**: `MissionRepository`, `StoragePort`, `SfxPort`;
      adaptador localStorage con lectura de `vice-tasks:v1` y preservación de
      `routineSeeded`; `WebAudioSfxAdapter` (tonos del HTML).
      *Check*: `npm test` con adaptador falso + `npm run typecheck`
- [ ] **T4 — Estado global**: reducer con comandos (toggle item, crear, borrar,
      filtro, sonido, click en mapa), transiciones de recompensa, persistencia como
      efecto del provider.
      *Check*: `npm test` (transiciones del reducer)
- [ ] **T5 — Slice mapa**: `useMapCamera` (pan, pinch, wheel, zoom por botones,
      clamp, fit), `CityMap` (SVG verbatim), capa de markers con counter-scale.
      *Check*: `npm run typecheck` + `npm run dev` manual (pan/zoom/pinch)
- [ ] **T6 — Slice UI**: HUD, MissionList + filtros, MissionPanel con checklist y
      progreso, CreateMissionModal (filas dinámicas, validaciones, pick en mapa),
      RespectOverlay con sfx, drawer responsive.
      *Check*: `npm run typecheck`
- [ ] **T7 — Composición + parity**: wiring en `AppProvider`, carga de datos
      existentes, Escape/backdrop/resize, responsive. Pasar el checklist de paridad.
      *Check*: parity manual lado a lado con `legacy/index.html`
- [ ] **T8 — Cierre**: `npm run typecheck && npm test && npm run build` en verde,
      commits work-unit en `feat/react-hexagonal-port`.
      *Check*: los tres comandos en verde

## Acceptance criteria — paridad

1. Carga inicial: muestra 3 misiones demo + 5 rutinas (si no hay datos guardados) o
   los datos guardados existentes (si los hay).
2. Nivel, barra EXP, stamina, intelligence, coins: idénticos al comportar igual las
   recompensas.
3. Marcar todos los items de una misión → overlay RESPECT+ + sonido, una sola vez.
4. Mapa: pan, pinch, wheel-zoom anclado al cursor, botones +/−/⌂, clamp, markers a
   tamaño constante con el zoom.
5. Clic en el mapa → abre modal con ubicación; "Pick on map" → crosshair → setea X/Y.
6. Lista con filtros All/Active/Done y seleccionada resaltada.
7. Panel: checklist, barra de progreso, borrar con confirmación.
8. Modal: filas dinámicas de checklist, validaciones (título, ≥1 item, ubicación).
9. Toggle de sonido persistido.
10. Escape cierra modal o panel; resize re-ajusta la vista.
11. Datos de `vice-tasks:v1` cargados sin pérdida.

## Forecast y entrega

Forecast: **~1500–1900 líneas autorizadas** (additions + deletions, sin contar el
SVG textual reubicado) → supera 400.

- `delivery_strategy`: **ask-on-risk** (default) → decisión de encadenamiento
  pendiente de confirmación del usuario antes del primer commit.
- `chain_strategy`: **pendiente**.

## Progress

- Ninguna tarea iniciada. Próximo paso: confirmar estrategia de entrega → T1.
