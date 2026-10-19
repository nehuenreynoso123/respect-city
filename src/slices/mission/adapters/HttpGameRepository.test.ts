import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/http/ApiError';

import type { MissionInput } from '../application/commands';
import type { PersistedState } from '../application/state';
import { HttpGameRepository } from './HttpGameRepository';

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

function stubFetch(respond: (url: string, init?: RequestInit) => Response) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    respond(String(input), init),
  );
  vi.stubGlobal('fetch', mock);
  return mock;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const lastCall = (mock: ReturnType<typeof stubFetch>): FetchArgs =>
  mock.mock.calls[mock.mock.calls.length - 1] as FetchArgs;

const serverState: PersistedState = {
  player: { exp: 750, stamina: 40, intel: 24, coins: 33 },
  missions: [
    {
      id: 'm1',
      title: 'Ship Login Feature',
      category: 'code',
      x: 1240,
      y: 740,
      respect: 300,
      items: [{ id: 'i1', text: 'Define API contract', done: true }],
      rewardGranted: true,
    },
  ],
  sound: false,
  routineSeeded: 1,
};

const missionInput: MissionInput = {
  id: 'm2',
  title: 'New Mission',
  category: 'code',
  x: 10,
  y: 20,
  respect: 100,
  items: [{ id: 'a', text: 'the task' }],
};

describe('HttpGameRepository', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('GET /api/state parses the PersistedState over a same-origin cookie', async () => {
    const mock = stubFetch(() => json(serverState));
    const repo = new HttpGameRepository('http://api.test');

    await expect(repo.load()).resolves.toEqual(serverState);
    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/state');
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('same-origin');
  });

  it('POST /api/missions sends the MissionInput as the JSON body', async () => {
    const mock = stubFetch(() => json(serverState, 201));
    const repo = new HttpGameRepository('http://api.test');

    await expect(repo.createMission(missionInput)).resolves.toEqual(serverState);
    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/missions');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('same-origin');
    expect(JSON.parse(String(init?.body))).toEqual(missionInput);
  });

  it('DELETE /api/missions/:missionId URL-encodes the id and sends no body', async () => {
    const mock = stubFetch(() => json(serverState));
    const repo = new HttpGameRepository('http://api.test');

    await repo.deleteMission('m/1');

    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/missions/m%2F1');
    expect(init?.method).toBe('DELETE');
    expect(init?.credentials).toBe('same-origin');
    expect(init?.body).toBeUndefined();
  });

  it('POST /api/missions/:missionId/items/:itemId/toggle maps both ids', async () => {
    const mock = stubFetch(() => json(serverState));
    const repo = new HttpGameRepository('http://api.test');

    await repo.toggleItem('m1', 'i 1');

    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/missions/m1/items/i%201/toggle');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('same-origin');
    expect(init?.body).toBeUndefined();
  });

  it('PATCH /api/sound sends the explicit enabled flag', async () => {
    const mock = stubFetch(() => json(serverState));
    const repo = new HttpGameRepository('http://api.test');

    await repo.toggleSound(false);

    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/sound');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual({ enabled: false });
  });

  it('throws an ApiError with code/message on a non-2xx response', async () => {
    stubFetch(() => json({ error: { code: 'not-found', message: 'State not found.' } }, 404));
    const repo = new HttpGameRepository('http://api.test');

    await expect(repo.load()).rejects.toBeInstanceOf(ApiError);
    await expect(repo.load()).rejects.toMatchObject({
      name: 'ApiError',
      code: 'not-found',
      message: 'State not found.',
    });
  });
});
