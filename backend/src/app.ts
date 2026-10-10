import Fastify, { type FastifyInstance } from 'fastify';

export interface AppOptions {
  logger?: boolean;
}

/**
 * Composition root: builds the Fastify instance and registers routes.
 * Adapters (prisma, jwt, hasher) get injected here as modules land.
 */
export function buildApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}