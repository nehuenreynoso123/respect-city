import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { DomainError } from '../../../shared/domain/errors.js';
import { requireAuth } from '../../auth/http/guard.js';
import type { TokenService } from '../../auth/ports/TokenService.js';
import { toggleSound } from '../../mission/application/toggleSound.js';
import { getOrCreateState } from '../application/getOrCreateState.js';
import type { StateRepository } from '../ports/StateRepository.js';

export interface StateDeps {
  stateRepository: StateRepository;
  tokenService: TokenService;
}

/** Body validation is shape-only; business rules live in the use case. */
const soundSchema = z.object({ enabled: z.boolean() });

export function registerStateRoutes(app: FastifyInstance, deps: StateDeps): void {
  const guard = requireAuth(deps.tokenService);

  app.get('/api/state', { preHandler: guard }, async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      throw new DomainError('unauthorized', 'Missing or invalid token.', 401);
    }
    reply.send(await getOrCreateState(deps.stateRepository, userId));
  });

  app.patch('/api/sound', { preHandler: guard }, async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      throw new DomainError('unauthorized', 'Missing or invalid token.', 401);
    }
    const body = soundSchema.parse(request.body);
    reply.send(await toggleSound(deps.stateRepository, userId, body));
  });
}
