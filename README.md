# Respect City

A gamified mission-control app for learning and job hunting, styled after a synthwave
Vice City map. You pin missions to a city map, break them into checklists, and earn
respect, EXP, coins and stats as you complete them. Accounts, progress and rewards are
persisted server-side, so the city follows you across devices.

The project started as a single-file vanilla prototype (`legacy/index.html`) and now runs
as a React SPA backed by a Fastify + PostgreSQL API.

## Features

- **Email + password accounts** with an httpOnly session cookie (the JWT never touches JavaScript).
- **Interactive city map** (2400x1600 world) with pan, zoom, district labels, mission pins
  and 2.5D SVG depth: extruded buildings and raised coastlines rendered as plain SVG, no WebGL.
- **Missions** with title, category, map location, respect value, optional learning method
  and a checklist. Created by tapping the map or from the header, edited from the side panel.
- **Server-authoritative rewards**: completing a checklist grants EXP, coins and category
  stats exactly once, enforced inside a database transaction (anti-cheat).
- **Progression**: levels every 500 EXP, stamina and intelligence bars (capped at 100) plus
  an uncapped coin counter.
- **Per-mission stopwatch** (play / pause / reset) persisted per user in `localStorage`;
  only one stopwatch runs at a time.
- **Seeded routine**: new accounts get demo missions plus a learning/job-hunt routine
  (versioned by `ROUTINE_VERSION`).
- **Sound effects** via Web Audio, with an account-wide on/off flag.
- **Full-stack Docker Compose** deployment (database + API + static frontend on one origin).

## How the game works

| Category | Stat it raises |
| -------- | -------------- |
| `gym`    | stamina        |
| `code`   | intelligence   |
| `work`   | coins          |
| `health` | stamina        |

When a mission's checklist is fully checked, the reward is granted once:

```
EXP    += respect
coins  += ceil(respect / 10)
stat   += 8            (the mission's category stat, capped at 100)
level   = floor(EXP / 500) + 1
```

The `method` field (active recall, spaced repetition, Feynman, interleaving, deliberate
practice, Pomodoro) is a label only: it never affects rewards or stats.

## Tech stack

| Layer      | Stack |
| ---------- | ----- |
| Frontend   | React 19, TypeScript (strict), Vite, Vitest |
| Backend    | Node 22, Fastify 5, TypeScript, Zod, Prisma 7, PostgreSQL 16 |
| Auth       | bcryptjs + JWT in an httpOnly cookie (`@fastify/cookie`) |
| Delivery   | Docker multi-stage builds, nginx static SPA + `/api` reverse proxy |

## Architecture

The repository is a plain monorepo: the frontend lives at the root (`src/`), the backend
in `backend/` with its own `package.json`. There is no workspace tooling.

### Frontend: hexagonal + vertical slices

```
src/
  app/                  App shell, providers, reducer -> API pipeline
  shared/               HTTP error mapping and generic UI primitives
  slices/
    audio/              SfxPort + Web Audio adapter
    auth/               AuthRepository port, HTTP adapter, login/register screen
    map/                Camera math, marker model, SVG city map
    mission/            Mission domain, reducer, commands, HTTP game repository, UI
    player/             Player stats, level math, rewards, HUD
    timer/              Stopwatch domain, localStorage store, timer provider and UI
```

Each slice keeps `domain/` and `application/` free of React, network and browser APIs;
`ports/` declares what it needs and `adapters/` implements it. HTTP access is
same-origin (`/api/*`); in development Vite proxies it to the backend.

`AppProvider` dispatches commands through the reducer. Local commands (`selectMission`,
`setFilter`) never hit the network; mutation commands are applied optimistically, sent to
the API, and the full server state replaces the local one (with rollback on failure).

### Backend: hexagonal modules

```
backend/src/
  modules/
    auth/               register/login, bcrypt and JWT adapters, cookie session, guard
    mission/            mission domain, create/delete/toggle use cases, routes
    player/             player domain, level and reward math
    state/              per-account game state aggregate + Prisma adapter
  shared/               Prisma client, domain errors
  config/               Zod-validated environment
  app.ts                Composition root: builds Fastify, injects adapters, registers routes
```

Domain and application layers do not import Fastify, Prisma or JWT; adapters are injected
in `app.ts`. Use cases return the complete persisted state, and every mutation is saved in
a single Prisma transaction.

### Auth and sessions

- `POST /api/auth/register` and `/api/auth/login` return `{ user }` only.
- The JWT is set in the `rc_session` cookie: `httpOnly`, `SameSite=Lax`, `Path=/api`,
  `Secure` controlled by `COOKIE_SECURE`, lifetime derived from `JWT_EXPIRES_IN`.
- The guard accepts the cookie only (no `Authorization: Bearer` channel).
- nginx proxies `/api` to the backend, so the browser sees a single origin and no CORS
  configuration is needed.

### Server authority

The client is never trusted for progression. Mission completion, the one-time reward
grant (`rewardGranted`), stat caps, routine seeding and mission validation all live in
the backend use cases.

## API

All responses are JSON. Authenticated endpoints require the session cookie.

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| `POST`   | `/api/auth/register` | no  | Create account, start session |
| `POST`   | `/api/auth/login` | no  | Start session |
| `POST`   | `/api/auth/logout` | no  | Clear the session cookie |
| `GET`    | `/api/me` | yes | Current user |
| `GET`    | `/api/state` | yes | Full game state (seeds demo + routine on first access) |
| `PATCH`  | `/api/sound` | yes | Set `{ enabled: boolean }` |
| `POST`   | `/api/missions` | yes | Create a mission |
| `DELETE` | `/api/missions/:missionId` | yes | Delete a mission |
| `POST`   | `/api/missions/:missionId/items/:itemId/toggle` | yes | Toggle a checklist item |
| `GET`    | `/health` | no  | Liveness probe |

Mutations return the full persisted state (`{ player, missions, sound, routineSeeded }`).
Errors use a shared envelope:

```json
{ "error": { "code": "missing-title", "message": "Give the mission a title." } }
```

## Data model

Prisma models (`backend/prisma/schema.prisma`):

- `User` - account (email, password hash).
- `Player` - one per user: `exp`, `stamina`, `intel`, `coins`, `sound`, `routineSeeded`.
- `Mission` - belongs to a user: title, category, map coordinates, respect, optional
  method, `rewardGranted`.
- `MissionItem` - checklist row of a mission: text, done flag, position.

Missions and items use client-generated ids, so the frontend reducer and the API share the
same aggregate shape.

## Getting started

### Prerequisites

- Node.js 22 or newer
- Docker (for PostgreSQL, or for the full stack)

### Local development

```powershell
# 1. Install dependencies
npm install
npm --prefix backend install

# 2. Configure the backend
Copy-Item backend/.env.example backend/.env

# 3. Start PostgreSQL
docker compose up -d postgres

# 4. Generate the Prisma client and apply migrations
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:deploy
```

Run the two dev servers in separate terminals:

```powershell
npm run dev:backend   # Fastify on http://localhost:3000
npm run dev           # Vite on http://localhost:5173 (proxies /api to :3000)
```

Open <http://localhost:5173> and register an account.

After changing `backend/prisma/schema.prisma`, create a migration from `backend/`:

```powershell
npx prisma migrate dev --name <migration-name>
```

### Docker Compose

```powershell
docker compose up --build
```

| Service  | URL |
| -------- | --- |
| Frontend | <http://localhost:8080> |
| Backend  | <http://localhost:3000> |
| Postgres | `localhost:5432` |

The backend image runs `prisma migrate deploy` before booting. For anything beyond local
use, set `JWT_SECRET` and, behind TLS, `COOKIE_SECURE=true`.

## Environment variables

Backend (`backend/.env`):

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` | `postgresql://respect:respect@localhost:5432/respect_city` | PostgreSQL connection string |
| `JWT_SECRET` | dev placeholder | Minimum 16 characters; replace in production |
| `JWT_EXPIRES_IN` | `7d` | Also used as the session cookie lifetime |
| `COOKIE_SECURE` | `true` when `NODE_ENV=production` | Set `false` for plain-HTTP deployments |

Frontend:

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `VITE_API_URL` | empty (same origin) | Optional absolute API base URL |

## Scripts

Root:

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production bundle (`dist/`) |
| `npm run preview` | Serve the built bundle |
| `npm test` | Frontend tests (Vitest, node environment) |
| `npm run test:watch` | Frontend tests in watch mode |
| `npm run typecheck` | TypeScript check |
| `npm run dev:backend` | Backend in watch mode |
| `npm run test:backend` | Backend tests |
| `npm run typecheck:backend` | Backend TypeScript check |
| `npm run build:backend` | Compile backend to `backend/dist/` |

Backend (`npm --prefix backend run <script>`):

| Script | Description |
| ------ | ----------- |
| `dev` | `tsx watch` the API |
| `build` | Compile with `tsconfig.build.json` |
| `start` | Run the compiled server |
| `test` / `test:watch` | Vitest |
| `prisma:generate` | Generate the Prisma client |
| `prisma:deploy` | Apply pending migrations |
| `prisma:studio` | Open Prisma Studio |

## Testing

- `npm test` covers frontend domain and application logic. Tests are pure TypeScript
  (`src/**/*.test.ts`), so no DOM environment is configured.
- `npm run test:backend` covers backend domain, use cases, routes and API end-to-end
  flows. Most suites use in-memory fakes, but
  `PrismaStateRepository.integration.test.ts` runs against a real database: start the
  Compose Postgres and provide `backend/.env` before running the suite.
- `npm run typecheck`, `npm run typecheck:backend` and both builds are the usual
  verification gate.

## Project layout

```
.
  src/                  React frontend (hexagonal slices)
  backend/              Fastify API, Prisma schema and migrations
  legacy/index.html     Original vanilla single-file prototype (reference only)
  odd/tasks/            Feature records: scope, decisions and verification evidence
  Dockerfile            Frontend image (Vite build -> nginx)
  docker-compose.yml    Postgres + backend + frontend
  nginx.conf            SPA fallback and /api reverse proxy
```

## Legacy prototype

`legacy/index.html` is the original 1,400-line vanilla implementation that the React port
kept behavior-compatible. It is kept as a reference for interaction details (map camera,
Escape key priorities, reward math) and is not part of the build.

## Additional documentation

The `odd/tasks/` directory documents each feature with its objective, scope, constraints
and verification evidence: `react-hexagonal-port`, `backend-core`, `dockerize-stack`,
`auth-hardening`, `learning-methods` and `stopwatch`.
