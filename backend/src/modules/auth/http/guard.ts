import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import type { TokenService } from '../ports/TokenService.js';

export function requireAuth(tokens: TokenService): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: { code: 'unauthorized', message: 'Missing or invalid token.' },
      });
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      return reply.code(401).send({
        error: { code: 'unauthorized', message: 'Missing or invalid token.' },
      });
    }

    try {
      const payload = tokens.verify(token);
      request.userId = payload.userId;
    } catch (error) {
      return reply.code(401).send({
        error: { code: 'unauthorized', message: 'Missing or invalid token.' },
      });
    }
  };
}

// Fastify module augmentation for userId
declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null;
  }
}
