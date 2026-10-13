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

  it('POSTs register to /api/auth/register with the credentials body', async () => {
    const mock = stubFetch(() =>
      json({ user: { id: 'u1', email: 'a@b.c' }, accessToken: 'tok' }, 201),
    );
    const adapter = new HttpAuthAdapter('http://api.test', () => null);

    const result = await adapter.register({ email: 'a@b.c', password: 'password1' });

    expect(result).toEqual({ user: { id: 'u1', email: 'a@b.c' }, accessToken: 'tok' });
    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/auth/register');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'a@b.c',
      password: 'password1',
    });
  });

  it('POSTs login to /api/auth/login', async () => {
    const mock = stubFetch(() =>
      json({ user: { id: 'u1', email: 'a@b.c' }, accessToken: 'tok' }),
    );
    const adapter = new HttpAuthAdapter('http://api.test', () => null);

    await adapter.login({ email: 'a@b.c', password: 'password1' });

    expect(lastCall(mock)[0]).toBe('http://api.test/api/auth/login');
  });

  it('GETs /api/me with the bearer token from the getter', async () => {
    const mock = stubFetch(() => json({ user: { id: 'u1', email: 'a@b.c' } }));
    const adapter = new HttpAuthAdapter('http://api.test', () => 'secret');

    const result = await adapter.me();

    expect(result).toEqual({ user: { id: 'u1', email: 'a@b.c' } });
    const [url, init] = lastCall(mock);
    expect(url).toBe('http://api.test/api/me');
    expect(init?.method ?? 'GET').toBe('GET');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
  });

  it('omits the Authorization header when there is no token', async () => {
    const mock = stubFetch(() => json({ error: { code: 'unauthorized', message: 'nope' } }, 401));
    const adapter = new HttpAuthAdapter('http://api.test', () => null);

    await expect(adapter.me()).rejects.toBeInstanceOf(ApiError);
    const [, init] = lastCall(mock);
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('maps a 401 error envelope to an ApiError code "unauthorized"', async () => {
    stubFetch(() =>
      json({ error: { code: 'invalid-credentials', message: 'Invalid email or password.' } }, 401),
    );
    const adapter = new HttpAuthAdapter('http://api.test', () => null);

    await expect(adapter.login({ email: 'a@b.c', password: 'nope' })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'invalid-credentials',
      message: 'Invalid email or password.',
    });
  });

  it('falls back to a generic ApiError on a non-JSON body', async () => {
    stubFetch(() => new Response('<html>boom</html>', { status: 500 }));
    const adapter = new HttpAuthAdapter('http://api.test', () => null);

    await expect(adapter.me()).rejects.toMatchObject({ name: 'ApiError', code: 'unknown' });
  });
});
