import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { DomainError } from '../../../shared/domain/errors.js';
import { login } from '../application/login.js';
import { register } from '../application/register.js';
import type { PasswordHasher } from '../ports/PasswordHasher.js';
import type { TokenService } from '../ports/TokenService.js';
import type { UserRepository } from '../ports/UserRepository.js';
import { requireAuth } from './guard.js';

export interface AuthDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

const authSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export function registerAuthRoutes(app: FastifyInstance, deps: AuthDeps): void {
  const guard = requireAuth(deps.tokenService);

  app.post('/api/auth/register', async (request, reply) => {
    const result = authSchema.safeParse(request.body);
    if (!result.success) {
      throw new DomainError('validation', result.error.issues[0]?.message ?? 'Invalid body.', 400);
    }
    const body = result.data;
    const response = await register(deps, body);
    reply.code(201).send(response);
  });

  app.post('/api/auth/login', async (request, reply) => {
    const result = authSchema.safeParse(request.body);
    if (!result.success) {
      throw new DomainError('validation', result.error.issues[0]?.message ?? 'Invalid body.', 400);
    }
    const body = result.data;
    const response = await login(deps, body);
    reply.code(200).send(response);
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
