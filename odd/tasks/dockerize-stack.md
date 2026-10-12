# ODD — dockerize-stack

**Feature**: despliegue full-stack con Docker Compose (db + backend + frontend).
**Creado**: 2026-10-12 · **Rama**: `feat/backend-core` (extiende la feature de backend)

## Objetivo

Extender `docker-compose.yml` (hoy solo PostgreSQL) para que un único
`docker compose up --build` levante los tres servicios: base de datos, backend
(Fastify/Prisma) y frontend (React/Vite servido como estático).

## Problema / Por qué

`docker-compose.yml` solo define `postgres`. Backend y frontend se corren a mano
con `npm run dev`, así que no hay forma reproducible de levantar ni desplegar el
stack completo. La feature `backend-core` dejó pendiente `prisma migrate deploy`
"para cuando haya Docker".

## Alcance

**IN**
- `backend/Dockerfile` multi-stage (build: `prisma generate` + `tsc`; runtime:
  `prisma migrate deploy` + `node dist/server.js`).
- `Dockerfile` raíz multi-stage (build Vite → nginx estático) + `nginx.conf`
  (fallback SPA) + `.dockerignore`.
- `backend/.dockerignore`.
- `docker-compose.yml`: servicios `backend` (:3000) y `frontend` (:8080) sobre
  `postgres`, con `depends_on`/healthcheck y variables de entorno.

**OUT (no ahora)**
- Integración front → API (no existe cliente HTTP todavía; es T7 de backend-core).
- Proxy nginx `/api` (especulativo sin cliente).
- Imágenes de desarrollo con hot reload.
- CI/CD, registry, TLS.

## Restricciones

1. Node 22 (`engines` del backend).
2. Imágenes de producción (build estático + `node dist`), no dev servers.
3. `DATABASE_URL` dentro de la red Compose apunta al host `postgres`.
4. No hornear `.env` en las imágenes.
5. TDD: off. RDD: off → verificación ordinaria.

## Tareas

- [x] **T1 — Backend image**: `backend/Dockerfile` multi-stage + `backend/.dockerignore`.
- [x] **T2 — Frontend image**: `Dockerfile` raíz + `nginx.conf` + `.dockerignore`.
- [x] **T3 — Compose**: agregar `backend` y `frontend` a `docker-compose.yml`.
- [x] **T4 — Verificación**: `docker compose config --services` → `postgres, backend, frontend` (exit 0).

## Acceptance criteria

1. `docker compose up --build` levanta postgres → backend (migraciones aplicadas)
   → frontend.
2. `http://localhost:3000/health` responde `{"status":"ok"}`.
3. `http://localhost:8080` sirve el SPA.
4. Sin `.env` ni `node_modules` del host dentro de las imágenes.

## Forecast y entrega

Forecast: **~150–250 líneas** (Dockerfiles + config + compose) → por debajo de 400.
`delivery_strategy`: **ask-on-risk** (no aplica split). `chain_strategy`: n/a.

## Progress

- ✅ Investigación inicial completa (stack, puertos, env, gotchas).
- ✅ **T1–T4 completos** (2026-10-12): 6 archivos escritos — `backend/Dockerfile`,
  `backend/.dockerignore`, `Dockerfile`, `.dockerignore`, `nginx.conf`,
  `docker-compose.yml`. RDD: off → verificación ordinaria. Lectura estructural de
  los 6 archivos + spot check `docker compose config --services` → PASS.
  Commit `ad60459` en `feat/backend-core` (pusheado a `origin`).
- ⚠️ **Build de imágenes NO verificado**: el daemon de Docker está caído en este
  entorno. Pendiente `docker compose up --build` cuando el daemon esté arriba.

## Gotchas (verificados)

- `prisma generate` carga `prisma.config.ts`, que ejecuta `env('DATABASE_URL')`
  y **lanza** `PrismaConfigEnvError` si la variable no existe
  (`node_modules/@prisma/config/dist/index.js:515`). En build hay que setear un
  `DATABASE_URL` placeholder: `generate` no abre conexión.
- Runtime de migraciones necesita `prisma.config.ts` + `prisma/` + el CLI
  `prisma` (devDependency) presentes en la imagen final.
- `docker` daemon caído en este entorno → el build no se puede verificar localmente.
