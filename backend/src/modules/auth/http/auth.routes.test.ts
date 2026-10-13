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

describe('auth routes', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    vi.clearAllMocks();
  });

  it('register 201', async () => {
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
    expect(res.json()).toEqual({
      user: { id: 'u1', email: 'test@example.com' },
      accessToken: 'token123',
    });
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

  it('login 200', async () => {
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
    expect(res.json().user.email).toBe('test@example.com');
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

  it('GET /api/me without token 401', async () => {
    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({ method: 'GET', url: '/api/me' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/me with valid token 200', async () => {
    fakeToken.verify.mockReturnValue({ userId: 'u1' });
    fakeRepo.findById.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'h' });

    app = buildApp({ userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken });
    const res = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { authorization: 'Bearer token123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: { id: 'u1', email: 'test@example.com' } });
  });
});
