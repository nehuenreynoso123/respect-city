import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import type { TokenService } from '../ports/TokenService.js';
import { SESSION_COOKIE } from './sessionCookie.js';

/**
 * Cookie-only authentication: the session cookie is the single source of
 * session. The `Authorization: Bearer` path was removed on purpose — two
 * auth channels would double the surface of every future auth change.
 */
export function requireAuth(tokens: TokenService): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies?.[SESSION_COOKIE];
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
