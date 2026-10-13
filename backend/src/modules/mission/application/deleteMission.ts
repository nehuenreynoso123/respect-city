import { DomainError } from '../../../shared/domain/errors.js';
import type { PersistedGameState, StateRepository } from '../../state/ports/StateRepository.js';
import { requireState } from './requireState.js';

/**
 * Removes a mission from the aggregate. Ported from the frontend deleteMission
 * command: deleting an unknown id is a no-op there, but the authoritative
 * command surfaces it as a 404 so the client can reconcile.
 */
export async function deleteMission(
  repo: StateRepository,
  userId: string,
  missionId: string,
): Promise<PersistedGameState> {
  const state = await requireState(repo, userId);

  const missions = state.missions.filter(m => m.id !== missionId);
  if (missions.length === state.missions.length) {
    throw new DomainError('not-found', 'Mission not found.', 404);
  }

  const next: PersistedGameState = { ...state, missions };
  await repo.save(userId, next);
  return next;
}
