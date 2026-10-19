# ODD — auth-hardening

**Feature**: sacar el token del alcance de JavaScript (cookie de sesión httpOnly) + limpieza del código muerto que dejó el port a la API.
**Creado**: 2026-10-18 · **Rama**: `feat/auth-hardening` (desde `feat/backend-core` @ `9d2f87e`)

## Objetivo

1. El access token JWT deja de vivir en `localStorage` y deja de viajar en el body:
   pasa a una cookie de sesión `httpOnly` emitida por el backend. El front no toca
   ni ve el token nunca.
2. Se elimina el código muerto: el duplicado legacy de rutina/seed en el front y
   toda la plomería de token en cliente (`session.ts`, slice `storage`).

## Problema / Por qué

- `src/slices/auth/application/session.ts` guardaba el JWT (7 días, sin revocación)
  en `localStorage['respect-city:token']`. Cualquier XSS o dependencia comprometida
  lo exfiltra; el propio archivo documentaba el tradeoff y anotaba la cookie
  httpOnly como pendiente de v2 (restricción 8 de `backend-core.md`).
- `src/slices/mission/routine.ts` quedó muerto tras la migración a API: `mergeRoutine`
  y `canonicalPositions` solo se referencian en su propio test, y `seedMissions` solo
  alimenta `freshAppState()`, estado que **nunca se renderiza** (`App.tsx`: `loading`
  → splash, `guest` → AuthScreen, `authenticated` → blob del server).
- `src/slices/storage/*` existe solo para guardar el token.

## Alcance

**IN**
- T1: borrar `src/slices/mission/routine.ts` + su test; `freshAppState().missions = []`.
- T2: backend con cookie de sesión httpOnly (`@fastify/cookie`), guard por cookie,
  `POST /api/auth/logout`, body de auth sin `accessToken`, `COOKIE_SECURE` en env.
- T3: front sin token (adapters con `credentials: 'same-origin'`, port `logout()`,
  boot por `GET /api/me`), borrar `session.ts` + slice `storage`.
- T4: nginx proxea `/api` al backend (mismo origen → cookies), compose + `.env.example`.

**OUT (no ahora)**
- Refresh token + rotación, revocación/blacklist, OAuth.
- CSRF double-submit token (innecesario con `SameSite=Lax` + mismo origen; se revisa
  solo si algún día el deploy es cross-site con `SameSite=None`).
- CSP / sanitización de XSS (defensa en profundidad aparte).
- Rate limiting en login.

## Restricciones

1. Hexagonal: dominio/application no importan Fastify ni cookies. El token lo mueve
   la capa `http/` (routes). Los use cases siguen siendo puros.
2. El token **nunca** se serializa en el body de la respuesta (eso es el fix real:
   si el body lo devuelve, un XSS lo roba en el login).
3. Cookie: `httpOnly`, `SameSite=Lax`, `Path=/api`, `Secure` configurable
   (`COOKIE_SECURE`, default = `NODE_ENV === 'production'`), `Max-Age` = TTL del JWT.
4. Se elimina el header `Authorization: Bearer` como vía de autenticación (una sola
   fuente de sesión: la cookie). `guard` responde 401 con el envelope existente.
5. Contrato de error y `PersistedState` sin cambios.
6. **TDD: off** (convención del proyecto: tests junto a cada unidad, sin ciclo estricto).
7. **RDD: off** (default) → verificación ordinaria: `typecheck` + `test` + `build`
   en ambas raíces + lectura estructural del diff.
8. Cambio de contrato atómico: backend y front van en el **mismo commit** (el commit
   del backend solo rompería el cliente).
9. Los ids cliente-generados, el optimistic pipeline y el anti-cheat server-side no
   se tocan.

## Tareas

- [x] **T1 — Código muerto del front**: borrar `src/slices/mission/routine.ts` y
      `routine.test.ts`; `freshAppState()` devuelve `missions: []`; sin imports
      colgando de `../routine`.
      *Check*: `npm run typecheck` + 15 files/97 tests + `npm run build` (front) → **OK**
      (commit `d210806`; assess `medium` → self-verification + spot check del orquestador
      reproduciendo `npm test` → 97 passed)
- [x] **T2 — Cookie de sesión (backend)**: `@fastify/cookie@11.1.3` en `buildApp`;
      `auth/http/sessionCookie.ts` (set/clear) + `auth/domain/duration.ts`
      (parser de TTL puro, fail-fast); `login`/`register` setean cookie `rc_session`
      y responden solo `{ user }`; `guard` lee `request.cookies` (**Bearer eliminado**);
      `POST /api/auth/logout` sin guard limpia la cookie; `COOKIE_SECURE` en env.
      *Check*: `typecheck:backend` + `build:backend` → **OK**; `test:backend` → 93 passed,
      2 rojos **ambientales** (`PrismaStateRepository.integration.test.ts`: Docker daemon
      apagado, `:5432` cerrado, archivo fuera del diff) → **OK con caveat de entorno**
- [x] **T3 — Sesión en cliente (front)**: `HttpAuthAdapter`/`HttpGameRepository` sin
      `getToken` + `credentials: 'same-origin'`; port `AuthRepository.logout()`;
      `AppProvider` boot por `me()` → `load()`, `logout` async resiliente a fallos de
      red, 401 mid-sesión → guest + notice; borrados `session.ts` + `session.test.ts` +
      `src/slices/storage/**`.
      *Check*: `typecheck` + 14 files/93 tests + `build` (front) → **OK**
      (T2+T3 en el commit atómico `d2e2ff7`; assess `high` hot_path auth)
- [x] **T4 — Deploy y documentación**: `nginx.conf` con `location /api/ →
      proxy_pass http://backend:3000` (sin barra final: el prefijo `/api` se reenvía
      tal cual); `COOKIE_SECURE` documentado en `docker-compose.yml` (default `false`
      porque el stack sirve HTTP plano en `:8080`) y en `backend/.env.example`;
      doc ODD al día.
      *Check*: revisión estructural de los 3 archivos → **OK** (commit `T4`)

## Acceptance criteria

1. Ningún valor de token es legible desde JavaScript: no hay `localStorage` de sesión,
   no hay `accessToken` en el body, no hay `Authorization: Bearer` en el cliente.
2. Login/register responden `Set-Cookie` con `HttpOnly`, `SameSite=Lax`, `Path=/api`
   y `Secure` según `COOKIE_SECURE`.
3. `GET /api/state`, `POST/DELETE /api/missions`, `POST .../toggle`, `PATCH /api/sound`
   funcionan solo con cookie; sin cookie → 401 con el envelope de siempre.
4. `POST /api/auth/logout` limpia la cookie y el front vuelve a `guest` sin dejar
   estado del usuario anterior.
5. `npm run typecheck`, `npm test`, `npm run build` en verde en front y backend.
6. No queda ningún import a `src/slices/mission/routine.ts` ni a `src/slices/storage/**`.

## Forecast y entrega

Forecast: **~450–550 líneas autorizadas** (additions + deletions, backend + front +
config; las borraciones cuentan) → supera 400.

- `delivery_strategy`: **ask-on-risk** → slices listos para PR si el usuario los pide:
  1. `T1` (borrado puro, revisable en 2 minutos).
  2. `T2 + T3` (contrato atómico) + `T4` (config de deploy).
- `chain_strategy`: a definir por el usuario si se abren PRs (**stacked-to-main**
  como en `backend-core`). Push y PR quedan en manos del usuario.

## Progress

- ✅ Plan presentado y aprobado ("a", 2026-10-18): Opción A (cookie httpOnly + proxy
  `/api` en nginx), con el código muerto como primer slice.
- ✅ Rama `feat/auth-hardening` creada desde `feat/backend-core` (`9d2f87e`).
- ✅ Doc creado antes del primer write (regla ODD).
- ✅ **T1 completo** → commit `d210806`: `routine.ts` + `routine.test.ts` borrados
  (143 + 67 líneas), `freshAppState().missions = []`. Gates front: typecheck + 97 tests
  + build en verde. 3 archivos, +1/-212.
- ✅ **T2 + T3 completos** → commit `d2e2ff7` (contrato atómico): backend con cookie
  `rc_session` (httpOnly, SameSite=Lax, Path=/api, Secure según `COOKIE_SECURE`,
  Max-Age = TTL del JWT vía `durationToSeconds`) y front sin token. 23 archivos,
  +456/-259. Evidencia de los invariantes duros:
  - body sin token: `Object.keys(res.json())` → `['user']` en `auth.routes.test.ts:53,123,176`
    y `api.e2e.test.ts:105,146`;
  - flags de cookie + `Secure` on/off + caso `COOKIE_SECURE=false` con `NODE_ENV=production`
    (`auth.routes.test.ts:58-96,149-152`), logout con `Max-Age=0`;
  - `git grep "localStorage\|Authorization\|getToken" -- src/` → sin resultados;
  - `accessToken` solo sobrevive como handoff de transporte en `http/routes.ts:45,56`.
- ✅ **Caveat de entorno, cerrado**: `backend/src/modules/state/adapters/
  PrismaStateRepository.integration.test.ts` fallaba con Docker apagado (`:5432`
  cerrado). Con el stack arriba, `npm run test:backend` → **19 files / 95 tests, todos
  en verde**. No era regresión ni queda pendiente.
- 🐛 **Bug de deploy encontrado al verificar en vivo (405)**: `docker compose up`
  recrea contenedores pero **NO reconstruye imágenes**. El contenedor de nginx seguía
  con la config vieja (sin `location /api/`) y devolvía `405 Not Allowed` a cualquier
  POST — lo mismo que un `POST` contra un servidor de archivos estáticos. El contenedor
  del backend también corría código pre-cookie. Fix: `docker compose build` y después
  `docker compose up -d`. Cualquier cambio en `nginx.conf`, en `Dockerfile` o en el
  backend exige rebuild, no solo restart.
- ✅ **Verificación end-to-end en el deploy real** (`:8080` → nginx → backend):
  - `POST /api/auth/register` → **201**, `set-cookie: rc_session=…; Max-Age=604800;
    Path=/api; HttpOnly; SameSite=Lax` (sin `Secure`: correcto con HTTP plano) y body
    `{"user":{…}}` **sin token** — el invariante duro, probado en producción;
  - `GET /api/me` con cookie → **200**; sin cookie → **401**;
  - `POST /api/auth/logout` → **200** con `rc_session=; Max-Age=0; … HttpOnly`.
  - Usuario de prueba creado para la prueba y **borrado** después (DELETE 1, remaining 0).
- ⚠️ **Caveat de verificación**: el verificador independiente convocado para el commit
  `d2e2ff7` devolvió un reporte no utilizable (afirmaba contenido de archivos que no
  existe, p. ej. `customErrorHandler` en `app.ts`, y que `session.ts` "se adaptó" cuando
  fue borrado). Sus 3 hallazgos (parsing de `duration`, coerción de `COOKIE_SECURE`,
  falta de asserts "sin token en body") fueron **refutados leyendo el código real y los
  tests**, no aceptados. La verificación independiente terminó haciéndola el orquestador.
- ✅ **T4 completo** → `nginx.conf` + `docker-compose.yml` + `backend/.env.example`.
- ✅ Gates finales: front `typecheck` + 93 tests + `build` ✔; backend `typecheck` +
  `build` ✔ (+ el caveat de integración arriba).

## Estado

Feature cerrada en la rama `feat/auth-hardening` (3 commits, pusheada a origin).
Gates finales: front 14 files/93 tests, backend 19 files/95 tests, y el flujo de
cookie verificado end-to-end contra el stack de docker.
Pendiente para el usuario: decidir si abre PR (slices propuestos: `d210806` y
`d2e2ff7`+`4e1a17a`, base `feat/backend-core` porque esa rama todavía no está mergeada
en `master`; el segundo slice queda sobre las 400 líneas → necesita `size:exception`).
Recordatorio de deploy: el stack de compose sirve HTTP plano, así que `COOKIE_SECURE=true`
recién cuando haya TLS delante — si no, el browser descarta la cookie. Y después de
cualquier cambio en `nginx.conf`/backend: `docker compose build && docker compose up -d`,
porque `up` solo no reconstruye.
