import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../app.js';

const fakeRepo = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
};

const fakeHasher = {
  hash: vi.fn(),
  verify: vi.fn(),
};

const fakeToken = {
  sign: vi.fn(),
  verify: vi.fn(),
};

/** First Set-Cookie header value emitted by the response. */
function firstSetCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  expect(value, 'expected a Set-Cookie header').toBeTypeOf('string');
  return String(value);
}

describe('auth routes', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('register 201 answers with the user only and sets the session cookie', async () => {
    fakeRepo.findByEmail.mockResolvedValue(null);
    fakeHasher.hash.mockResolvedValue('hashed');
    fakeRepo.create.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'hashed' });
    fakeToken.sign.mockReturnValue('token123');

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(201);
    // The token is transport-owned: it must never appear in the body.
    expect(res.json()).toEqual({ user: { id: 'u1', email: 'test@example.com' } });
    expect(fakeToken.sign).toHaveBeenCalledWith('u1');

    const setCookie = firstSetCookie(res);
    expect(setCookie).toContain('rc_session=token123');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/api');
    // Max-Age mirrors the JWT TTL (default 7d).
    expect(setCookie).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
    expect(setCookie).not.toContain('Secure');
  });

  it('sets the Secure flag when COOKIE_SECURE=true', async () => {
    vi.stubEnv('COOKIE_SECURE', 'true');
    fakeRepo.findByEmail.mockResolvedValue(null);
    fakeHasher.hash.mockResolvedValue('hashed');
    fakeRepo.create.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'hashed' });
    fakeToken.sign.mockReturnValue('token123');

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    expect(firstSetCookie(res)).toContain('Secure');
  });

  it('omits the Secure flag when COOKIE_SECURE=false (string "false" is falsy)', async () => {
    vi.stubEnv('COOKIE_SECURE', 'false');
    vi.stubEnv('NODE_ENV', 'production'); // would default Secure on; the explicit 'false' wins
    fakeRepo.findByEmail.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'hashed' });
    fakeHasher.verify.mockResolvedValue(true);
    fakeToken.sign.mockReturnValue('token123');

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(firstSetCookie(res)).not.toContain('Secure');
  });

  it('duplicate register 409', async () => {
    fakeRepo.findByEmail.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'h' });

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('login 200 answers with the user only and sets the session cookie', async () => {
    fakeRepo.findByEmail.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'hashed' });
    fakeHasher.verify.mockResolvedValue(true);
    fakeToken.sign.mockReturnValue('token123');

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: { id: 'u1', email: 'test@example.com' } });
    const setCookie = firstSetCookie(res);
    expect(setCookie).toContain('rc_session=token123');
    expect(setCookie).toContain('HttpOnly');
  });

  it('bad login 401', async () => {
    fakeRepo.findByEmail.mockResolvedValue(null);

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('logout 200 clears the cookie even without a session', async () => {
    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    const setCookie = firstSetCookie(res);
    expect(setCookie).toContain('rc_session=;');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('Path=/api');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
  });

  it('GET /api/me without a session cookie 401', async () => {
    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({ method: 'GET', url: '/api/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toEqual({
      code: 'unauthorized',
      message: 'Missing or invalid token.',
    });
  });

  it('GET /api/me with a valid session cookie 200', async () => {
    fakeToken.verify.mockReturnValue({ userId: 'u1' });
    fakeRepo.findById.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'h' });

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      cookies: { rc_session: 'token123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: { id: 'u1', email: 'test@example.com' } });
    // The guard hands the cookie value to the token service — nothing else.
    expect(fakeToken.verify).toHaveBeenCalledWith('token123');
  });

  it('GET /api/me with a rejected cookie 401', async () => {
    fakeToken.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      cookies: { rc_session: 'garbage' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/me ignores an Authorization Bearer header (path removed)', async () => {
    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: 'Bearer token123' },
    });
    expect(res.statusCode).toBe(401);
    expect(fakeToken.verify).not.toHaveBeenCalled();
  });
});
