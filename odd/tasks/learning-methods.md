# ODD — learning-methods

**Feature**: campo `method` (método de aprendizaje) en las misiones, como eje aparte de `category`.
**Creado**: 2026-10-12 · **Rama**: `feat/backend-core`

## Objetivo

Agregar un campo opcional `method` a cada misión que registre QUÉ técnica de
aprendizaje se usó. Se elige al crear la misión y se muestra en el panel.
Es **solo etiqueta**: no toca recompensas, EXP, coins ni stats.

## Problema / Por qué

El objetivo del proyecto es facilitar el aprendizaje mediante gamificación. Hoy
la única clasificación es `category`, que es un eje doble (dominio de vida →
`icon`/`color`/`stat`) definido en `CATEGORIES`. No hay dónde registrar la
técnica de estudio, que es información central para el aprendizaje.

Decisión de producto (2026-10-12): modelar el método como **campo separado**,
no como una entrada más de `CATEGORIES`, para no mezclar dos ejes en una sola
dimensión y no forzar un `stat` ficticio por método. El método es una etiqueta.

## Alcance

**IN** (slice front, autocontenida):

- `src/slices/mission/domain/methods.ts`: `METHODS` map (6 técnicas de estudio)
  + `MethodKey` + `methodOf()` con fallback seguro.
- `Mission.method?: MethodKey` en `src/slices/mission/domain/types.ts`
  (opcional → compatibilidad con datos guardados `vice-tasks:v1`).
- `MissionInput.method?` (`application/commands.ts`), `MissionDraft.method`,
  `emptyDraft`, `validateDraft` (`ui/missionDraft.ts`), y `createMission` que
  persiste `method` cuando viene.
- `CreateMissionModal`: selector "Learning method" (con opción "— none —").
- `MissionPanel`: muestra el método en el header.
- Tests de dominio (`methods.test.ts`) y de draft (`missionDraft.test.ts`).

**OUT (no ahora)**

- Backend (columna Prisma + dominio + `PrismaStateRepository`): tarea aparte,
  cuando se cablee el front a la API (T7 de `backend-core`).
- Filtrar/agrupar por método en la lista.
- Que el método afecte recompensas/stats (decisión: NO).
- Asignar métodos a las misiones semilla/rutina.

## Restricciones

1. Método = solo etiqueta; NO toca `rewards.ts` ni stats.
2. Compatibilidad con datos persistidos: misión sin `method` se carga sin romper
   (`parsePersistedState` pasa las misiones intactas).
3. Copy/UI en inglés (resto del front está en inglés); doc ODD en español.
4. TDD: off. RDD: off → verificación ordinaria (typecheck + tests + build).

## Tareas

- [x] **T1 — Dominio `methods`**: `methods.ts` con las 6 técnicas + `methodOf`
      + `methods.test.ts`.
- [x] **T2 — Wiring del modelo**: `Mission.method?`, `MissionInput.method?`,
      `MissionDraft.method`, `emptyDraft`, `validateDraft`, `createMission`
      + tests de draft.
- [x] **T3 — UI modal**: selector "Learning method" en `CreateMissionModal`.
- [x] **T4 — UI panel**: mostrar el método en `MissionPanel`.
- [x] **T5 — Verificación**: typecheck + tests + build en verde; cierre del doc.

## Acceptance criteria

1. Una misión puede tener `method` entre las 6 técnicas, o ninguno (`undefined`).
2. Elegir método en el modal lo persiste (`vice-tasks:v1`) y sobrevive un reload.
3. Misiones guardadas sin `method` se cargan sin romper.
4. El método NO altera EXP/coins/stats.
5. Gates verdes: `npm run typecheck`, `npm test`, `npm run build`.

## Forecast y entrega

Forecast: **~120–200 líneas** → por debajo de 400.
`delivery_strategy`: **ask-on-risk** (no aplica split). `chain_strategy`: n/a.

## Progress

- ✅ Exploración: modelo `Mission` (front + back), `CATEGORIES`, `missionDraft`,
  `CreateMissionModal`, persistencia `vice-tasks:v1`, schema Prisma.
- ✅ **T1–T5 completos** (2026-10-12): 2 archivos nuevos
  (`domain/methods.ts`, `domain/methods.test.ts`) + 7 archivos modificados +
  2 tests nuevos de draft. Implementación delegada a un writer.
  Verificación: `npm run typecheck` PASS · `npm test` **91 tests / 15 files**
  PASS · `npm run build` PASS. `review assess` → **medium** (cambio aditivo);
  writer self-verify + spot check del orquestador → PASS.
  Commit `672e722` en `feat/backend-core` (sin push).
- ✅ Wiring y persistencia: `parsePersistedState` no requirió cambios — pasa las
  misiones intactas, así que misiones viejas sin `method` cargan sin romper
  (`methodOf(undefined) → null` → el panel no renderiza nada).
