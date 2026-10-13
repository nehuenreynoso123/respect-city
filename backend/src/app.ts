import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { loadEnv } from './config/env.js';
import { BcryptPasswordHasher } from './modules/auth/adapters/BcryptPasswordHasher.js';
import { JwtTokenService } from './modules/auth/adapters/JwtTokenService.js';
import { PrismaUserRepository } from './modules/auth/adapters/PrismaUserRepository.js';
import type { PasswordHasher } from './modules/auth/ports/PasswordHasher.js';
import type { TokenService } from './modules/auth/ports/TokenService.js';
import type { UserRepository } from './modules/auth/ports/UserRepository.js';
import { registerAuthRoutes } from './modules/auth/http/routes.js';
import { registerMissionRoutes } from './modules/mission/http/routes.js';
import { PrismaStateRepository } from './modules/state/adapters/PrismaStateRepository.js';
import { registerStateRoutes } from './modules/state/http/routes.js';
import type { StateRepository } from './modules/state/ports/StateRepository.js';
import { prisma } from './shared/db/prisma.js';
import { DomainError } from './shared/domain/errors.js';

export interface AppOptions {
  logger?: boolean;
  userRepository?: UserRepository;
  passwordHasher?: PasswordHasher;
  tokenService?: TokenService;
  stateRepository?: StateRepository;
}

/**
 * Composition root: builds the Fastify instance and registers routes.
 * Adapters (prisma, jwt, hasher) get injected here as modules land.
 */
export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });
  app.decorateRequest('userId', null);

  const env = loadEnv();

  const userRepository = options.userRepository ?? new PrismaUserRepository(prisma);
  const passwordHasher = options.passwordHasher ?? new BcryptPasswordHasher();
  const tokenService =
    options.tokenService ?? new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const stateRepository = options.stateRepository ?? new PrismaStateRepository(prisma);

  registerAuthRoutes(app, { userRepository, passwordHasher, tokenService });
  registerStateRoutes(app, { stateRepository, tokenService });
  registerMissionRoutes(app, { stateRepository, tokenService });

  app.get('/health', async () => ({ status: 'ok' }));

  // Orphan routes still answer with the shared error envelope.
  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: { code: 'not-found', message: 'Route not found.' } });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DomainError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? 'Validation error';
      return reply.code(400).send({
        error: { code: 'validation', message },
      });
    }
    request.log.error({ err: error }, 'Unhandled error');
    return reply.code(500).send({
      error: { code: 'internal', message: 'Internal server error.' },
    });
  });

  return app;
}
