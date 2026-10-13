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
      (commit pendiente)
- [ ] **T4 — Auth**: register/login (bcryptjs + jsonwebtoken), guard JWT en rutas
      protegidas.
      *Check*: tests de use cases + rutas vía `app.inject()` → OK
- [ ] **T5 — Comandos autoritativos**: create/delete/toggle/sound con anti-cheat
      transaccional (rewardGranted once, caps, math portado del front).
      *Check*: tests de aplicación con repos fakes + integración → OK
- [ ] **T6 — HTTP final**: rutas de missions + state + sound, error handler,
      envelope de error, respuesta `PersistedState` en cada mutación.
      *Check*: `app.inject()` E2E auth→state→mutaciones + gates → OK
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
- ⬜ T4 — auth.

## Decisiones de diseño (cambios respecto del plan original)

- **`StateRepository` en vez de repos por módulo**: el plan original separaba
  `PrismaMissionRepository` de `PrismaPlayerRepository`. El toggle + grant de
  recompensa exige atomicidad entre misión y player, y la API devuelve el blob
  completo (`PersistedState`) — así que el agregado persistido es **toda la
  partida por usuario** (player + missions), espejando el `MissionRepository`
  del front. Métodos CRUD del puerto: `findByUser`, `create`, `save` (upsert
  atómico + delete de missions ausentes).

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
- **Migración offline**: con el daemon de Docker caído, la migración
  `20261009224308_init` se generó con `migrate diff --from-empty --to-schema
  --script -o`. Pendiente para cuando haya Docker: `npm run prisma:deploy`
  (aplica la migración a Postgres) + tests de integración reales de
  `PrismaStateRepository` (por ahora cubierto por typecheck/generación).