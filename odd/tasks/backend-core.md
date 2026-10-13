# ODD — backend-core

**Feature**: backend como fuente de verdad + cloud sync real para Respect City.
**Creado**: 2026-10-09 · **Rama**: `feat/backend-core` (desde `master`)

## Objetivo

Convertir a Respect City en una app con cuenta personal: auth + player + missions
persistidas en un backend Node/TS, con validación de recompensas **server-side**
(anti-cheat). El front deja de ser local-first puro y sincroniza contra la API.

## Problema / Por qué

El port React (`react-hexagonal-port`) ya entregó arquitectura hexagonal y tests,
pero los datos viven en `localStorage` (`vice-tasks:v1`): sin cuenta, sin sync
multi-device, sin historial ni rachas, y el cliente es la única autoridad sobre
las recompensas (EXP, coins, stats). El objetivo declarado es escalar el proyecto
como portfolio + practicar backend (Node, TS, PostgreSQL, REST, JWT, hexagonal).

## Alcance

**IN (v1 — sync core)**
- Auth: register + login con JWT (email + password, bcryptjs).
- Player + missions persistidos en PostgreSQL vía Prisma.
- Comandos autoritativos server-side: create/delete mission, toggle item,
  toggle sound. Cada mutación valida y devuelve el `PersistedState` completo.
- Anti-cheat: `missionDone` + `rewardGranted una sola vez` + `computeMissionReward`
  + caps de stats se re-implementan en el backend dentro de una transacción.
- Routine: `ROUTINE_MISSIONS`/`ROUTINE_VERSION` pasan a vivir en el backend y se
  seedean al crear la cuenta.
- Frontend: slice `auth/` (login/register), `HttpMissionRepository` (mismo puerto
  `MissionRepository`, cambia el adaptador), reconciliación optimista en
  `AppProvider`.
- Docker Compose para PostgreSQL, env validado con zod.

**OUT (v2, no ahora)**
- Historial de completions por fecha, rachas, reset diario de rutina.
- Refresh token en cookie httpOnly, OAuth.
- Offline-first (cache local + sync con conflictos), leaderboards, comunidad.

## Restricciones

1. **Monorepo**: todo vive en `backend/` dentro de este repo, con su propia
   `package.json` (sin workspace tooling). El front sigue en `src/`.
2. **Stack fijo**: Node 22 + TypeScript estricto + Fastify + Prisma/PostgreSQL +
   JWT + zod. Hexagonal casero espejando el front (dominio/application no importan
   Fastify, Prisma ni JWT; adaptadores inyectados en el composition root).
3. **Ids cliente-generados**: missions e items conservan los `uid()` del front;
   el server los acepta tal cual (el reducer actual los genera en el dispatch).
4. **Rutina autoritativa**: el server seedea demo + rutina al crear la cuenta;
   `mergeRoutine` del cliente queda como no-op (los títulos ya existen).
5. **Respuesta autoritativa**: cada mutación devuelve el `PersistedState`
   completo; el cliente reemplaza su estado (sin lógica de merge). `selectedId` y
   `filter` siguen siendo solo locales.
6. **TDD: off** — sin configuración TDD; se escriben tests junto con cada unidad
   (convención del proyecto, no strict RED/GREEN).
7. **RDD: off** (default) → verificación ordinaria: `typecheck` + `test` + `build`
   + lectura estructural.
8. **Token v1**: access token JWT en memoria en el front (sin refresh).
   Tradeoff XSS documentado; hardening httpOnly → v2.

## Arquitectura objetivo

Espejo del front: mismo lenguaje, mismo patrón.

```
backend/
  prisma/
    schema.prisma, migrations/, seed.ts
  src/
    app.ts                    # composición Fastify (composition root)
    server.ts                 # bootstrap + graceful shutdown
    config/env.ts             # zod-validated env
    shared/
      http/                   # error handler, not-found, request-id, envelope
      domain/errors.ts        # DomainError base
    modules/
      auth/
        domain/               # User (email, passwordHash)
        application/          # register, login use cases
        ports/                # PasswordHasher, TokenService, UserRepository
        adapters/             # bcryptjs, jsonwebtoken, PrismaUserRepository
        http/                 # routes register/login + guard JWT
      player/
        domain/               # Player, caps, level (port de src/.../player)
        application/          # applyRewards (transaccional)
        ports/ + adapters/    # PrismaPlayerRepository
      mission/
        domain/               # Mission, items, missionDone, rewards math
        application/          # create, delete, toggle, sound
        ports/ + adapters/    # PrismaMissionRepository
        routine.ts            # ROUTINE_MISSIONS + ROUTINE_VERSION (migrado del front)
```

## API (v1)

- `POST /api/auth/register` → `{ user, accessToken }`
- `POST /api/auth/login` → `{ user, accessToken }`
- `GET /api/state` → `PersistedState` (player + missions + sound + routineSeeded)
- `POST /api/missions` (createMission, ids del cliente)
- `DELETE /api/missions/:id`
- `POST /api/missions/:id/items/:itemId/toggle` (anti-cheat transaccional)
- `PATCH /api/sound` `{ enabled }`

## Tareas

- [x] **T1 — Scaffold backend**: `backend/` con package.json, TS estricto, vitest,
      zod env, Fastify app mínima + test de health, docker-compose (postgres),
      `.env.example`, scripts root `dev:backend|test:backend|typecheck:backend`.
      *Check*: `npm run typecheck && npm test && npm run build` en `backend/` → **OK**
      (commit `a3fb7c1`)
- [x] **T2 — Dominio portado**: mission (Mission, ChecklistItem, missionDone,
      rewards math) + player (caps, exp/level) + `ROUTINE_MISSIONS` server-side.
      Tests portados desde el front (spec de verdad).
      *Check*: `npm test` en `backend/` → **OK** (20 tests, 5 files · commit `c68c3ae`)
- [x] **T3 — Prisma + adaptadores**: schema (User, Player, Mission, MissionItem),
      migración inicial generada offline, `prisma.config.ts` + driver adapter pg;
      `StateRepository` (agregado player+missions) + `PrismaStateRepository`.
      *Check*: `npm run prisma:generate` + `npm test` + `typecheck` + `build` → **OK**
      (commit `315ff49`)
- [x] **T4 — Auth**: register/login (bcryptjs + jsonwebtoken), guard JWT en rutas
      protegidas.
      *Check*: `typecheck` + `build` + 37 tests (10 files) + rutas vía `app.inject()`
      → **OK** (commit `c0323a1`)
- [x] **T5 — Comandos autoritativos**: create/delete/toggle/sound con anti-cheat
      transaccional (rewardGranted once, caps, math portado del front).
      *Check*: `prisma:generate` + `typecheck` + `test` (66 tests, 16 files, incl.
      integración real) + `build` → **OK** (commits `cc04f5e`, `c694ffe`; assess
      medium → verificación ordinaria, sin review)
- [x] **T6 — HTTP final**: rutas de missions + state + sound, error handler,
      envelope de error, respuesta `PersistedState` en cada mutación.
      *Check*: `typecheck` + `test` (79 tests, 18 files, incl. E2E `app.inject()`
      auth→state→mutaciones) + `build` → **OK** (commits `fc3ae64`, `08d417b`;
      assess medium → verificación ordinaria, sin review)
- [ ] **T7 — Frontend**: slice `auth/` (login/register), `HttpMissionRepository`
      como adaptador del puerto existente, reconciliación optimista en
      `AppProvider`, logout.
      *Check*: gates front en verde + parity de comandos manual → OK
- [ ] **T8 — Cierre**: gates front + back en verde, PRs stacked-to-main,
      cierre del doc.
      *Check*: `typecheck` + `test` + `build` en ambas raíces → OK

## Acceptance criteria — v1

1. Registro y login con email/password devuelven `{ user, accessToken }`; rutas
   protegidas rechazan sin/ con token inválido (401).
2. `GET /api/state` de una cuenta nueva devuelve demo + rutina seedeadas y
   `routineSeeded` correcto.
3. Crear/borrar misión y togglear items persisten y devuelven el estado
   autoritativo; misión completa → recompensas aplicadas en el player.
4. Toggle de una misión ya recompensada NO re-grantea (overlay "REWARD ALREADY
   CLAIMED" en el front, sin doble EXP/coins/stat).
5. Las stats respetan el cap 100; coins = ceil(respect/10); exp += respect.
6. Cada misión/item pertenece al usuario autenticado (aislamiento entre cuentas).
7. El front arranca logueado contra la API: crea, toglea, borra y cierra sonido
   con la misma UX que hoy (parity de comandos con `legacy/index.html`).
8. `selectedId`/`filter` no viajan al server.
9. Gates: `typecheck` + `test` + `build` en verde en `backend/` y en el front.

## Forecast y entrega

Forecast: **~1700–2100 líneas autorizadas** (additions + deletions, backend +
integración front) → supera 400.

- `delivery_strategy`: **ask-on-risk** → encadenado, aprobado en plan (2026-10-09).
- `chain_strategy`: **stacked-to-main** (como en react-hexagonal-port).

## Progress

- ✅ Plan aprobado por el usuario (2026-10-09): cloud sync real + Fastify/hexagonal
  casero/Prisma + alcance sync core.
- ✅ Rama `feat/backend-core` creada desde `master` (0dc8632).
- ✅ **T1 completo** → commit `a3fb7c1`: `backend/` con Fastify 5 + TS 7 estricto +
  Vitest 5 + zod env + Prisma 7.10.0, `docker-compose.yml` (postgres:16),
  `.env.example`, scripts root. Gates: `typecheck` + 1 test + `build` en verde.
- ✅ **T2 completo** → commit `c68c3ae`: dominio portado del front 1:1
  (`mission/domain`: types, categories, ids, missionDone, rewards, routine;
  `player/domain`: player, reward, level) + tests. Gates: `typecheck` +
  20 tests (5 files) en verde.
- ✅ **T3 completo** → commit `315ff49`: schema Prisma (4 tablas, cascade), migración
  `20261009224308_init` generada offline, `prisma.config.ts` + `@prisma/adapter-pg`,
  `StateRepository` + `PrismaStateRepository` (agregado por usuario, `save()` atómico
  upsert/delete). Gates: `prisma:generate` + `typecheck` + 20 tests + `build` verde.
- ✅ **T4 completo** → commit `c0323a1`: `auth/` con `domain/user` (normalize,
  validación email/password), `application/register|login` (AuthResponse
  `{ user, accessToken }`), puertos `UserRepository|PasswordHasher|TokenService`,
  adaptadores `PrismaUserRepository|BcryptPasswordHasher|JwtTokenService`, rutas
  `POST /api/auth/register` (201) + `POST /api/auth/login` (200) + `GET /api/me`
  protegida por `requireAuth`. `DomainError` + error handler en `app.ts` como
  composition root con adaptadores inyectables. Gates: `typecheck` + `build` +
  37 tests (10 files) verde.
- ✅ **T5 completo** → commits `cc04f5e` + `c694ffe`: schema ampliado (Player
  `sound Boolean @default(true)` + `routineSeeded Int @default(0)`, Mission
  `method String?`; migración `20261013022456_add_player_flags_and_mission_method`
  aplicada vía `migrate dev`); `PersistedGameState` = blob legacy completo;
  `player/application/applyRewards` (port literal del `playerReducer`);
  `mission/application/` con `requireState` (404 `state-not-found` si no hay
  estado) + `createMission|deleteMission|toggleMissionItem|toggleSound`
  (anti-cheat: grant solo en transición not-done→done, `rewardGranted` una vez,
  caps 100, math del front). Tests: 66 (16 files) incl. integración real
  `PrismaStateRepository.integration.test.ts` contra el Postgres de compose —
  cierra el pendiente de T3.
- ✅ **T6 completo** → commits `fc3ae64` + `08d417b`: `getOrCreateState` (seedea
  demo + rutina en el primer `GET /api/state` — no en register — y corre
  `mergeRoutine` en CADA lectura persistiendo solo si cambió, igual que el boot
  del front); rutas `GET /api/state` + `PATCH /api/sound` (state/http) y
  `POST /api/missions` (201) + `DELETE /api/missions/:missionId` +
  `POST /api/missions/:missionId/items/:itemId/toggle` (mission/http), todas con
  guard JWT y respuesta = `PersistedState` completo; body zod shape-only
  (reglas de negocio siguen en los use cases como única fuente de codes);
  `setNotFoundHandler` con el envelope `{ error }`. Tests: 79 (18 files) incl.
  E2E `api.e2e.test.ts` (auth→state→mutaciones, 401 por ruta, aislamiento entre
  cuentas, sin doble grant, 404 envelope).
- ⬜ T7 — Frontend.

## Decisiones de diseño (cambios respecto del plan original)

- **`StateRepository` en vez de repos por módulo**: el plan original separaba
  `PrismaMissionRepository` de `PrismaPlayerRepository`. El toggle + grant de
  recompensa exige atomicidad entre misión y player, y la API devuelve el blob
  completo (`PersistedState`) — así que el agregado persistido es **toda la
  partida por usuario** (player + missions), espejando el `MissionRepository`
  del front. Métodos CRUD del puerto: `findByUser`, `create`, `save` (upsert
  atómico + delete de missions ausentes).
- **`GET /api/me` fuera del plan original (T4)**: se agregó una ruta protegida
  mínima para tener un caso real de guard JWT testeable de punta a punta con
  `app.inject()`, sin esperar a las rutas de `state` (T6). El front la usará en
  T7 para validar el token guardado antes de pedir el estado.
- **`PersistedGameState` extendido (T5)**: pasó de `{ player, missions }` a
  exactamente el blob legacy `{ player, missions, sound, routineSeeded }`.
  El toggle de sonido (T5) y el `GET /api/state` (T6) necesitan esas flags, y la
  restricción 5 exige devolver el `PersistedState` completo en cada mutación.
- **Drift de `method` cerrado en T5**: learning-methods (`672e722`) agregó
  `method` al `Mission` del front, pero el backend no lo persistía. Se portó
  `mission/domain/methods.ts` (`MethodKey`) + columna `method String?` +
  mapeo en `PrismaStateRepository`; sin esto, T7 habría perdido el tag al
  sincronizar.
- **`requireState` como contrato único**: cada comando falla con
  `state-not-found` 404 si la cuenta aún no tiene estado. El seeding (demo +
  rutina) llega en T6 — el register (T4) queda sin seeding para no tocar un
  módulo ya cerrado.
- **Seeding en el primer `GET /api/state`, no en register (T6)**: el plan decía
  "seedea al crear la cuenta"; se implementó en `getOrCreateState` (lazy, primer
  acceso) para no tocar el register de T4. Contrato resultante: una cuenta sin
  estado recibe 404 `state-not-found` en los comandos hasta que alguien pida
  `/api/state` — el front hace ese GET en el boot, así que en la práctica el
  seed ocurre antes de cualquier mutación (E2E usa un helper `registerAndSeed`).
- **`mergeRoutine` en cada lectura (T6)**: espeja `load()` del front — el
  mismo ref se devuelve cuando `routineSeeded >= ROUTINE_VERSION`, así que el
  persist solo corre cuando la rutina realmente cambió (listo para futuros
  bumps de `ROUTINE_VERSION` sin migrar datos).
- **Validación shape-only en las rutas (T6)**: el zod de HTTP valida forma
  (ids no vacíos, tipos, enums de categoría/método derivados de
  `Object.keys(CATEGORIES|METHODS)`); los errores de negocio (missing-title,
  missing-items, missing-location) siguen saliendo de los use cases con sus
  codes/mensajes originales del front — una sola fuente de verdad.
- **Envelope 404 de rutas huérfanas (T6)**: `setNotFoundHandler` devuelve
  `{ error: { code: 'not-found', message: 'Route not found.' } }` para que TODA
  respuesta de error use el mismo contenedor. Falta `request-id` (deferido: no
  lo exige la v1 y el handler de error ya loguea el request).
- **Raza teórica del toggle (deferida a v2)**: read→muta→save es atómico por
  agregado (`save()` transaccional del repo, upsert + delete en una
  transacción), pero dos toggles concurrentes en la misma misión podrían leer
  el mismo `rewardGranted` y doble-grantear. Para v1 (un usuario, un device) se
  acepta; hardening con update condicional / SELECT FOR UPDATE → v2.
- **`requireAuth` como factory**: el guard se construye con el `TokenService`
  inyectado (`requireAuth(tokens)`) y devuelve un `preHandlerAsyncHookHandler`.
  El `userId` se decora en el request (`decorateRequest('userId', null)`) y se
  tipa por module augmentation en `guard.ts`.

## Gotchas

- **Prisma `latest` apunta a una RC**: en el registro, `prisma` `latest` =
  `8.0.0-rc.22` (exige Node ≥22.18, tenemos 22.17) mientras `@prisma/client`
  `latest` = `7.10.0` estable. Se pineó `prisma@^7.10.0` para alinear major.
- **4 vulns high dev-only** en el árbol del CLI de Prisma (`@prisma/config` →
  `deepmerge-ts` GHSA-ggr8-5vv4-36mx; `mysql2` que no usamos). No afectan el
  runtime (`@prisma/client`); el "fix" de npm es un downgrade major a Prisma 6 →
  se acepta y se documenta.
- **Sin path alias en el backend**: `tsc` no reescribe `paths` en el emit de ESM,
  así que `node dist/server.js` rompería con `@/...`. Imports relativos con
  extensión `.js` (NodeNext). El front mantiene `@/` porque Vite lo resuelve.
- **`prisma` y `@prisma/client` deben compartir major**: instalar `prisma` por
  separado puede traerse la RC; pinear ambos a `7.10.0`.
- **Prisma 7 rompió el setup clásico**: `url` en el datasource del schema ya no
  existe. La conexión de Migrate/Studio vive en `prisma.config.ts`
  (`defineConfig({ datasource: { url } })`) y el runtime usa driver adapter
  (`new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`,
  `@prisma/adapter-pg` + `pg`). El CLI requiere `dotenv` para leer `.env` en
  `prisma.config.ts`.
- **`prisma migrate diff` cambió el flag**: `--to-schema-datamodel` no existe en
  Prisma 7; es `--to-schema`.
- **Migración offline (T3) vs. `migrate dev` (T5)**: con el daemon caído, T3
  generó la migración inicial con `migrate diff --from-empty --to-schema
  --script -o`. Con Docker arriba, T5 usó `prisma migrate dev` (aplicó pending,
  diffeó, generó el client) → migración `20261013022456_add_player_flags_and_mission_method`
  aplicada y `migrate status` up to date. El pendiente documentado de T3 quedó
  cerrado: la suite incluye `PrismaStateRepository.integration.test.ts` real.