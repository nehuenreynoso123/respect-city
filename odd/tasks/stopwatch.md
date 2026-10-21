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
usuario quiere saber cuánto tiempo le dedication a cada misión para poder
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

- [ ] **T1 — Dominio + estado puro**: `domain/timer.ts`, `application/timers.ts`,
      `adapters/localStorageTimerStore.ts` + tests (`timer.test.ts`).
- [ ] **T2 — Provider + hook + UI**: `TimerProvider.tsx`, `useMissionTimer.ts`,
      `ui/Stopwatch.tsx` + estilos en `styles.css`.
- [ ] **T3 — Wiring**: `MissionPanel` (cronómetro de la misión abierta) +
      `MissionList` (chip de tiempo acumulado) + `App.tsx` (mount del provider).
- [ ] **T4 — Verificación**: typecheck + tests + build en verde; cierre del doc.

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
