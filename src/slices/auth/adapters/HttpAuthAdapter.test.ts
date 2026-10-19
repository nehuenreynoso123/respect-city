import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/http/ApiError';

import { HttpAuthAdapter } from './HttpAuthAdapter';

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

describe('HttpAuthAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs register with credentials and returns only the user', async () => {
    const mock = stubFetch(() => json({ user: { id: 'u1', email: 'a@b.c' } }, 201));
    const adapter = new HttpAuthAdapter('http://api.test');

    const result = await adapter.register({ email: 'a@b.c', password: 'password1' });

    expect(result).toEqual({ user: { id: 'u1', email: 'a@b.c' } });
    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/auth/register');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('same-origin');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'a@b.c',
      password: 'password1',
    });
  });

  it('POSTs login same-origin and returns only the user', async () => {
    const mock = stubFetch(() => json({ user: { id: 'u1', email: 'a@b.c' } }));
    const adapter = new HttpAuthAdapter('http://api.test');

    const result = await adapter.login({ email: 'a@b.c', password: 'password1' });

    expect(result).toEqual({ user: { id: 'u1', email: 'a@b.c' } });
    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/auth/login');
    expect(init?.credentials).toBe('same-origin');
  });

  it('GETs /api/me same-origin so the session cookie rides along', async () => {
    const mock = stubFetch(() => json({ user: { id: 'u1', email: 'a@b.c' } }));
    const adapter = new HttpAuthAdapter('http://api.test');

    const result = await adapter.me();

    expect(result).toEqual({ user: { id: 'u1', email: 'a@b.c' } });
    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/me');
    expect(init?.method ?? 'GET').toBe('GET');
    expect(init?.credentials).toBe('same-origin');
  });

  it('POSTs logout to /api/auth/logout same-origin and resolves void', async () => {
    const mock = stubFetch(() => json({ ok: true }));
    const adapter = new HttpAuthAdapter('http://api.test');

    await expect(adapter.logout()).resolves.toBeUndefined();

    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/auth/logout');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('same-origin');
  });

  it('propagates an ApiError when logout fails', async () => {
    stubFetch(() => json({ error: { code: 'internal', message: 'boom' } }, 500));
    const adapter = new HttpAuthAdapter('http://api.test');

    await expect(adapter.logout()).rejects.toBeInstanceOf(ApiError);
  });

  it('maps a 401 error envelope to an ApiError code "unauthorized"', async () => {
    stubFetch(() =>
      json({ error: { code: 'invalid-credentials', message: 'Invalid email or password.' } }, 401),
    );
    const adapter = new HttpAuthAdapter('http://api.test');

    await expect(adapter.login({ email: 'a@b.c', password: 'nope' })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'invalid-credentials',
      message: 'Invalid email or password.',
    });
  });

  it('falls back to a generic ApiError on a non-JSON body', async () => {
    stubFetch(() => new Response('<html>boom</html>', { status: 500 }));
    const adapter = new HttpAuthAdapter('http://api.test');

    await expect(adapter.me()).rejects.toMatchObject({ name: 'ApiError', code: 'unknown' });
  });

  it('maps a bare 401 without the envelope to code "unauthorized"', async () => {
    stubFetch(() => new Response('Not authorized', { status: 401 }));
    const adapter = new HttpAuthAdapter('http://api.test');

    await expect(adapter.me()).rejects.toMatchObject({
      name: 'ApiError',
      code: 'unauthorized',
    });
  });
});
