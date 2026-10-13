import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { DomainError } from '../../../shared/domain/errors.js';
import { requireAuth } from '../../auth/http/guard.js';
import type { TokenService } from '../../auth/ports/TokenService.js';
import type { StateRepository } from '../../state/ports/StateRepository.js';
import { createMission, type CreateMissionInput } from '../application/createMission.js';
import { deleteMission } from '../application/deleteMission.js';
import { toggleMissionItem } from '../application/toggleMissionItem.js';
import { CATEGORIES } from '../domain/categories.js';
import { METHODS } from '../domain/methods.js';

export interface MissionDeps {
  stateRepository: StateRepository;
  tokenService: TokenService;
}

const OBJECT_KEYS = Object.keys(CATEGORIES) as [string, ...string[]];
const METHOD_KEYS = Object.keys(METHODS) as [string, ...string[]];

/**
 * Shape-only body validation (ids are client-generated). Business rules —
 * empty title, no items, missing location — stay in the use case so its codes
 * and messages remain the single source of truth.
 */
const createMissionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  category: z.enum(OBJECT_KEYS),
  x: z.number().nullable(),
  y: z.number().nullable(),
  respect: z.union([z.number(), z.string()]),
  items: z.array(z.object({ id: z.string().min(1), text: z.string() })),
  method: z.enum(METHOD_KEYS).optional(),
});

const missionParamsSchema = z.object({ missionId: z.string().min(1) });
const itemParamsSchema = z.object({
  missionId: z.string().min(1),
  itemId: z.string().min(1),
});

export function registerMissionRoutes(app: FastifyInstance, deps: MissionDeps): void {
  const guard = requireAuth(deps.tokenService);

  app.post('/api/missions', { preHandler: guard }, async (request, reply) => {
    const userId = requireUserId(request.userId);
    const body = createMissionSchema.parse(request.body) as CreateMissionInput;
    reply.code(201).send(await createMission(deps.stateRepository, userId, body));
  });

  app.delete('/api/missions/:missionId', { preHandler: guard }, async (request, reply) => {
    const userId = requireUserId(request.userId);
    const { missionId } = missionParamsSchema.parse(request.params);
    reply.send(await deleteMission(deps.stateRepository, userId, missionId));
  });

  app.post(
    '/api/missions/:missionId/items/:itemId/toggle',
    { preHandler: guard },
    async (request, reply) => {
      const userId = requireUserId(request.userId);
      const { missionId, itemId } = itemParamsSchema.parse(request.params);
      reply.send(await toggleMissionItem(deps.stateRepository, userId, missionId, itemId));
    },
  );
}

function requireUserId(userId: string | null): string {
  if (!userId) {
    throw new DomainError('unauthorized', 'Missing or invalid token.', 401);
  }
  return userId;
}
