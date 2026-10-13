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
import { prisma } from './shared/db/prisma.js';
import { DomainError } from './shared/domain/errors.js';

export interface AppOptions {
  logger?: boolean;
  userRepository?: UserRepository;
  passwordHasher?: PasswordHasher;
  tokenService?: TokenService;
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

  registerAuthRoutes(app, { userRepository, passwordHasher, tokenService });

  app.get('/health', async () => ({ status: 'ok' }));

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
