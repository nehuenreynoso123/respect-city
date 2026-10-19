import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import type { User } from './auth/domain/user.js';
import type { PasswordHasher } from './auth/ports/PasswordHasher.js';
import type { TokenService } from './auth/ports/TokenService.js';
import type { UserRepository } from './auth/ports/UserRepository.js';
import { ROUTINE_VERSION } from './mission/domain/routine.js';
import type { Mission } from './mission/domain/types.js';
import type { PersistedGameState, StateRepository } from './state/ports/StateRepository.js';

const DEMO_AND_ROUTINE = 8;

interface Harness {
  app: FastifyInstance;
}

/** In-memory doubles: no Prisma, no DB — fakes only. */
function createHarness(): Harness {
  const users = new Map<string, User>();
  const usersByEmail = new Map<string, string>();
  let userSeq = 0;

  const userRepository: UserRepository = {
    async findByEmail(email) {
      const id = usersByEmail.get(email);
      return id ? (users.get(id) ?? null) : null;
    },
    async findById(id) {
      return users.get(id) ?? null;
    },
    async create(input) {
      const id = `u${++userSeq}`;
      const user: User = { id, email: input.email, passwordHash: input.passwordHash };
      users.set(id, user);
      usersByEmail.set(input.email, id);
      return user;
    },
  };

  const passwordHasher: PasswordHasher = {
    async hash(plain) {
      return `hashed:${plain}`;
    },
    async verify(plain, hash) {
      return hash === `hashed:${plain}`;
    },
  };

  const tokenService: TokenService = {
    sign(userId) {
      return `token:${userId}`;
    },
    verify(token) {
      const userId = token.startsWith('token:') ? token.slice('token:'.length) : '';
      if (!userId) throw new Error('invalid token');
      return { userId };
    },
  };

  const states = new Map<string, PersistedGameState>();
  const stateRepository: StateRepository = {
    async findByUser(userId) {
      return states.get(userId) ?? null;
    },
    async create(userId, state) {
      states.set(userId, structuredClone(state));
    },
    async save(userId, state) {
      states.set(userId, structuredClone(state));
    },
  };

  return {
    app: buildApp({ userRepository, passwordHasher, tokenService, stateRepository }),
  };
}

/**
 * Reads the session cookie a login/register response just issued. The client
 * never sees the token; it only replays the opaque cookie the browser holds.
 */
function sessionCookieOf(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie'];
  const header = Array.isArray(raw) ? raw[0] : raw;
  const value = /rc_session=([^;]*)/.exec(String(header ?? ''));
  expect(value?.[1], 'login/register must set the rc_session cookie').toBeTruthy();
  return decodeURIComponent(value?.[1] ?? '');
}

/** Inject-option carrying the session cookie a browser would replay. */
const cookie = (token: string): { cookies: { rc_session: string } } => ({
  cookies: { rc_session: token },
});

async function registerUser(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'password123' },
  });
  expect(res.statusCode).toBe(201);
  // The body carries the user alone; the token rides in the Set-Cookie header.
  expect(Object.keys(res.json())).toEqual(['user']);
  return sessionCookieOf(res);
}

/** Register + GET /api/state so the account aggregate exists (seeded). */
async function registerAndSeed(app: FastifyInstance, email: string): Promise<string> {
  const token = await registerUser(app, email);
  const res = await app.inject({ method: 'GET', url: '/api/state', ...cookie(token) });
  expect(res.statusCode).toBe(200);
  return token;
}

const newMission = {
  id: 'm1',
  title: 'Run',
  category: 'gym',
  x: 10,
  y: 20,
  respect: 500,
  items: [{ id: 'a', text: 'Do it' }],
};

describe('api e2e', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    ({ app } = createHarness());
  });

  afterEach(async () => {
    await app.close();
  });

  it('register → login → GET /api/state seeds demo + routine', async () => {
    await registerUser(app, 'a@example.com');
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'a@example.com', password: 'password123' },
    });
    expect(login.statusCode).toBe(200);
    expect(Object.keys(login.json())).toEqual(['user']);
    const token = sessionCookieOf(login);

    const res = await app.inject({ method: 'GET', url: '/api/state', ...cookie(token) });
    expect(res.statusCode).toBe(200);
    const state = res.json();
    expect(state.missions).toHaveLength(DEMO_AND_ROUTINE);
    expect(state.routineSeeded).toBe(ROUTINE_VERSION);
    expect(state.sound).toBe(true);
    expect(state.player).toEqual({ exp: 0, stamina: 0, intel: 0, coins: 0 });
  });

  it('POST /api/missions returns 201 and the full state', async () => {
    const token = await registerAndSeed(app, 'a@example.com');
    const res = await app.inject({
      method: 'POST',
      url: '/api/missions',
      ...cookie(token),
      payload: newMission,
    });
    expect(res.statusCode).toBe(201);
    const state = res.json();
    expect(state.missions).toHaveLength(DEMO_AND_ROUTINE + 1);
    const created = state.missions.find((m: Mission) => m.id === 'm1');
    expect(created).toMatchObject({ id: 'm1', title: 'Run', category: 'gym', respect: 500 });
  });

  it('rejects a body missing required fields with the validation envelope', async () => {
    const token = await registerAndSeed(app, 'a@example.com');
    const { title, ...body } = newMission;
    void title; // required field omitted on purpose to trigger validation
    const res = await app.inject({
      method: 'POST',
      url: '/api/missions',
      ...cookie(token),
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('validation');
  });

  it('surfaces use-case business errors with the front messages', async () => {
    const token = await registerAndSeed(app, 'a@example.com');
    const post = (payload: Record<string, unknown>) =>
      app.inject({ method: 'POST', url: '/api/missions', ...cookie(token), payload });

    const missingTitle = await post({ ...newMission, title: '   ' });
    expect(missingTitle.statusCode).toBe(400);
    expect(missingTitle.json().error).toEqual({
      code: 'missing-title',
      message: 'Give the mission a title.',
    });

    const missingItems = await post({ ...newMission, items: [] });
    expect(missingItems.statusCode).toBe(400);
    expect(missingItems.json().error).toEqual({
      code: 'missing-items',
      message: 'Add at least one checklist item.',
    });

    const missingLocation = await post({ ...newMission, x: null, y: null });
    expect(missingLocation.statusCode).toBe(400);
    expect(missingLocation.json().error).toEqual({
      code: 'missing-location',
      message: 'Pick a location on the map first.',
    });
  });

  it('grants rewards once and never double-grants across toggles', async () => {
    const token = await registerAndSeed(app, 'a@example.com');
    await app.inject({
      method: 'POST',
      url: '/api/missions',
      ...cookie(token),
      payload: newMission,
    });

    const toggle = () =>
      app.inject({ method: 'POST', url: '/api/missions/m1/items/a/toggle', ...cookie(token) });

    const first = await toggle();
    expect(first.statusCode).toBe(200);
    const granted = { exp: 500, stamina: 8, intel: 0, coins: 50 };
    expect(first.json().player).toEqual(granted);
    expect(first.json().missions.find((m: Mission) => m.id === 'm1').rewardGranted).toBe(true);

    const off = await toggle();
    expect(off.json().player).toEqual(granted);

    const onAgain = await toggle();
    expect(onAgain.json().player).toEqual(granted);
    expect(onAgain.json().missions.find((m: Mission) => m.id === 'm1').rewardGranted).toBe(true);
  });

  it('DELETE /api/missions/:missionId removes the mission', async () => {
    const token = await registerAndSeed(app, 'a@example.com');
    await app.inject({
      method: 'POST',
      url: '/api/missions',
      ...cookie(token),
      payload: newMission,
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/missions/m1',
      ...cookie(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().missions.some((m: Mission) => m.id === 'm1')).toBe(false);
  });

  it('PATCH /api/sound flips the sound flag', async () => {
    const token = await registerAndSeed(app, 'a@example.com');
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/sound',
      ...cookie(token),
      payload: { enabled: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sound).toBe(false);
  });

  it('rejects every protected route without a session cookie', async () => {
    const routes: { method: 'GET' | 'POST' | 'DELETE' | 'PATCH'; url: string }[] = [
      { method: 'GET', url: '/api/state' },
      { method: 'GET', url: '/api/me' },
      { method: 'POST', url: '/api/missions' },
      { method: 'DELETE', url: '/api/missions/m1' },
      { method: 'POST', url: '/api/missions/m1/items/a/toggle' },
      { method: 'PATCH', url: '/api/sound' },
    ];
    for (const route of routes) {
      const res = await app.inject({ ...route, payload: {} });
      expect(res.statusCode, `${route.method} ${route.url}`).toBe(401);
      expect(res.json().error.code).toBe('unauthorized');
    }
  });

  it('isolates accounts: user B never sees user A data', async () => {
    const tokenA = await registerAndSeed(app, 'a@example.com');
    const aState = (
      await app.inject({ method: 'GET', url: '/api/state', ...cookie(tokenA) })
    ).json();
    await app.inject({
      method: 'POST',
      url: '/api/missions',
      ...cookie(tokenA),
      payload: { ...newMission, id: 'a-created', title: 'A only' },
    });

    const tokenB = await registerAndSeed(app, 'b@example.com');
    const bState = (
      await app.inject({ method: 'GET', url: '/api/state', ...cookie(tokenB) })
    ).json();

    expect(bState.missions).toHaveLength(DEMO_AND_ROUTINE);
    expect(bState.missions.some((m: Mission) => m.id === 'a-created')).toBe(false);

    const aIds = aState.missions.map((m: Mission) => m.id);
    const bIds = bState.missions.map((m: Mission) => m.id);
    expect(bIds.every((id: string) => !aIds.includes(id))).toBe(true);
  });

  it('answers unknown routes with the not-found envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'not-found', message: 'Route not found.' } });
  });
});
