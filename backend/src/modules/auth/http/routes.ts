import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { DomainError } from '../../../shared/domain/errors.js';
import { login } from '../application/login.js';
import { register } from '../application/register.js';
import type { PasswordHasher } from '../ports/PasswordHasher.js';
import type { TokenService } from '../ports/TokenService.js';
import type { UserRepository } from '../ports/UserRepository.js';
import { requireAuth } from './guard.js';
import { clearSessionCookie, setSessionCookie } from './sessionCookie.js';

export interface AuthDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  /** Resolved from COOKIE_SECURE; applied to set/clear cookie flags. */
  cookieSecure: boolean;
  /** Cookie Max-Age, sized from the JWT TTL (JWT_EXPIRES_IN). */
  sessionMaxAgeSeconds: number;
}

const authSchema = z.object({
  email: z.string(),
  password: z.string(),
});

/**
 * Transport invariant: the access token produced by the use cases is moved
 * into the httpOnly session cookie here and is NEVER serialized into the
 * response body. Login/register answer with `{ user }` only — a body token
 * would be readable by any XSS at login time, defeating the whole point.
 */
export function registerAuthRoutes(app: FastifyInstance, deps: AuthDeps): void {
  const guard = requireAuth(deps.tokenService);
  const cookieOptions = { secure: deps.cookieSecure, maxAgeSeconds: deps.sessionMaxAgeSeconds };

  app.post('/api/auth/register', async (request, reply) => {
    const result = authSchema.safeParse(request.body);
    if (!result.success) {
      throw new DomainError('validation', result.error.issues[0]?.message ?? 'Invalid body.', 400);
    }
    const body = result.data;
    const response = await register(deps, body);
    setSessionCookie(reply, response.accessToken, cookieOptions);
    reply.code(201).send({ user: response.user });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const result = authSchema.safeParse(request.body);
    if (!result.success) {
      throw new DomainError('validation', result.error.issues[0]?.message ?? 'Invalid body.', 400);
    }
    const body = result.data;
    const response = await login(deps, body);
    setSessionCookie(reply, response.accessToken, cookieOptions);
    reply.code(200).send({ user: response.user });
  });

  // No guard on purpose: logging out must succeed even with an expired or
  // missing cookie, otherwise the client can never clear a stale session.
  app.post('/api/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply, { secure: deps.cookieSecure });
    reply.code(200).send({ ok: true });
  });

  app.get('/api/me', { preHandler: guard }, async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      throw new DomainError('unauthorized', 'Missing or invalid token.', 401);
    }
    const user = await deps.userRepository.findById(userId);
    if (!user) {
      throw new DomainError('unauthorized', 'Missing or invalid token.', 401);
    }
    reply.send({ user: { id: user.id, email: user.email } });
  });
}
