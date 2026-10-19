import { DomainError } from '../../../shared/domain/errors.js';
import type { PersistedGameState, StateRepository } from '../../state/ports/StateRepository.js';

/**
 * Loads the caller's persisted aggregate or fails with the same 404 the API
 * returns before any state has been seeded (seeding lands in T6). Every
 * command starts here so the "no state" contract lives in one place.
 */
export async function requireState(
  repo: StateRepository,
  userId: string,
): Promise<PersistedGameState> {
  const state = await repo.findByUser(userId);
  if (!state) {
    throw new DomainError('state-not-found', 'No saved state for this account.', 404);
  }
  return state;
}
