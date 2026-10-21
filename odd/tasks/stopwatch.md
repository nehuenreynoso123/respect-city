# ODD — stopwatch

**Feature**: cronómetro por misión (play / pause / reset) para saber cuánto
tiempo se le dedica a cada tarea.
**Creado**: 2026-10-21 · **Rama**: `feat/stopwatch`

## Objetivo

Agregar un cronómetro simple en el frontend: se puede dar play, pausar y
reiniciar el tiempo de una misión (tarea). El objetivo es **medir el tiempo
dedicado a cada tarea**, no gamificar ni agregar recompensas.

## Problema / Por qué

Hoy el juego mide progreso (items marcados, EXP, coins) pero no effort. El
usuario quiere saber cuánto tiempo le dedico a cada misión para poder
planificar y comparar bloques de trabajo (la rutina ya define bloques de
30–90 min).

Decisiones de producto (2026-10-21):

1. El cronómetro es **por misión** (una misión = una tarea), no global.
2. Persistencia **solo en el frontend** (`localStorage`), sin tocar backend,
   API ni esquema Prisma. Se evita una migración para un cronómetro.
3. **Un solo cronómetro corriendo a la vez**: al dar play en una misión, la
   que estaba corriendo se pausa sola. Evita el "estoy contando dos tareas".
4. El tiempo corre aunque el timer quede abierto: si la sesión queda con el
   cronómetro corriendo, al volver sigue contando (se guarda el timestamp
   de arranque, no un contador).

## Alcance

**IN (slice front, autocontenida):**

- `src/slices/timer/domain/timer.ts`: modelo puro del cronómetro
  (`Stopwatch`, `elapsedOf`, `startStopwatch`, `pauseStopwatch`,
  `resetStopwatch`, `formatElapsed`).
- `src/slices/timer/application/timers.ts`: estado puro del mapa
  misión → cronómetro (`playTimer`, `pauseTimer`, `resetTimer`), con la regla
  de "solo uno corriendo".
- `src/slices/timer/adapters/localStorageTimerStore.ts`: persistencia
  `localStorage` con scope por usuario.
- `src/slices/timer/application/TimerProvider.tsx` + `useMissionTimer.ts`:
  contexto React y hook de lectura (valor vivo, tick propio).
- `src/slices/timer/ui/Stopwatch.tsx`: control con play / pause / reset.
- `MissionPanel`: muestra el cronómetro de la misión seleccionada.
- `MissionList`: chip con el tiempo acumulado de cada misión.
- `styles.css`: estilos del cronómetro y del chip de tiempo.
- Tests de dominio y de aplicación (Vitest, sin DOM).

**OUT (no ahora)**

- Backend: columna/API para el tiempo acumulado (migración Prisma aparte).
- Exportar o reportar el tiempo (estadísticas, historial por día).
- Cronómetro por ítem del checklist (solo por misión).
- Lap times /(split) o metas por misión.

## Restricciones

1. El cronómetro **no** toca `rewards.ts`, EXP, coins ni stats.
2. Front-only: cero cambios en `backend/` y cero cambios de API.
3. Copy/UI en inglés (resto del front en inglés); doc ODD en español.
4. Tests: `src/**/*.test.ts` con `environment: 'node'` (Vitest) — nada de
   tests de componente React (no hay testing-library en el repo).
5. TDD: **off** (convención del repo, ver `odd/tasks/learning-methods.md`).
   RDD: **off** (`gentle-ai review mode status` → off) → verificación
   ordinaria: `npm run typecheck` + `npm test` + `npm run build`.
6. No romper el gate de auth: el `TimerProvider` se monta dentro de la rama
   autenticada de `App.tsx`, con scope por `user.id`.

## Tareas

- [x] **T1 — Dominio + estado puro**: `domain/timer.ts`, `application/timers.ts`,
      `adapters/localStorageTimerStore.ts` + tests (`timer.test.ts`).
- [x] **T2 — Provider + hook + UI**: `TimerProvider.tsx`, `useMissionTimer.ts`,
      `ui/Stopwatch.tsx` + estilos en `styles.css`.
- [x] **T3 — Wiring**: `MissionPanel` (cronómetro de la misión abierta) +
      `MissionList` (chip de tiempo acumulado) + `App.tsx` (mount del provider).
- [x] **T4 — Verificación**: typecheck + tests + build en verde; cierre del doc.

## Acceptance criteria

1. Con una misión seleccionada, el panel muestra `MM:SS` y tres controles:
   play, pause y reset.
2. Play arranca el cronómetro; pause lo congela; reset vuelve a `00:00`.
3. Dar play en otra misión pausa la anterior (solo una corriendo).
4. El tiempo acumulado de cada misión se ve en la lista (chip `⏱ MM:SS`).
5. El tiempo sobrevive un reload del navegador (persistencia localStorage con
   scope por usuario) y el cronómetro sigue corriendo si quedó activo.
6. Ningún cambio en `backend/`, en la API ni en el esquema de datos.
7. Gates verdes: `npm run typecheck`, `npm test`, `npm run build`.

## Forecast y entrega

Forecast: **~250–380 líneas** → por debajo de 400.
`delivery_strategy`: **ask-on-risk** (no aplica split). `chain_strategy`: n/a.

## Progress

- ✅ Exploración: `MissionPanel`, `MissionList`, `HUD`, `AppProvider`,
  `styles.css` (paleta neon), `vite.config.ts` (Vitest `node`, solo
  `*.test.ts`), convención de slices (`domain` / `application` / `ui` /
  `adapters`), auth por cookie httpOnly (el scope del timer es `user.id`).
- ✅ **T1–T4 completos** (2026-10-21). Implementación delegada a un writer.
  4 work-unit commits en `feat/stopwatch` (sin push, sin PR):
  - `0f60c8a` `feat(timer): add stopwatch domain model and per-mission timer state`
  - `b14ddf6` `feat(timer): add stopwatch provider, hook and UI control`
  - `b691f9d` `feat(ui): wire stopwatch into mission panel and mission list`
  - `a57cded` `docs(odd): add stopwatch feature doc`
- ✅ Verificación (observada por el orquestador, no solo por el writer):
  `npm run typecheck` PASS · `npm test` **124 tests / 17 files** PASS
  (baseline 93/14 → **+31 tests**, solo lógica pura) · `npm run build` PASS.
  `gentle-ai review assess --base-ref master` → **medium**
  (`executable_change` en `src/app/App.tsx`). RDD off → verificación ordinaria:
  writer self-verification + re-run del orquestador de los 3 gates.
- ✅ `backend/` intacto, cero cambios de API, cero dependencias nuevas.

## Notas de implementación

- El reloj se deriva del wall clock (`elapsedMs` congelado + `runningSince`),
  nunca de un contador que tickea: sobrevive al reload y no depende de que el
  interval corra en tiempo real.
- Un solo cronómetro corriendo a la vez (`playTimer` pausa los demás).
- El tick vive en el hook (`useMissionTimer`): un cronómetro detenido no
  re-renderiza nada y solo el que corre tickea (1 Hz).
- Persistencia en `localStorage` con scope por usuario
  (`rc-timers:v1:<userId>`); el provider no escribe antes de cargar el scope
  (si no, el primer render pisaba el mapa guardado con `{}`).
- El chip de tiempo de la lista es un componente hijo: los hooks no pueden
  ejecutarse dentro de un `.map`.
- TypeScript 7 no narrowea con un helper `boolean` (`isRunning`), por eso
  `elapsedOf` captura `runningSince` en una const local.

## Next steps

- Verificación manual en el navegador (el repo no tiene tests de DOM):
  `npm run dev` → abrir una misión → Play / Pause / Reset → recargar y
  comprobar que el tiempo persiste.
- Decisión del usuario: push de `feat/stopwatch` y apertura de PR contra
  `master` (no se hizo push ni PR).
