import type { PersistedGameState, StateRepository } from '../../state/ports/StateRepository.js';
import { requireState } from './requireState.js';

export interface ToggleSoundInput {
  enabled: boolean;
}

/**
 * Sets the account-wide sound flag. Ported from the frontend toggleSound
 * command (there without payload, flipping the flag; the API carries the
 * desired value so the client can reconcile with the authoritative blob).
 */
export async function toggleSound(
  repo: StateRepository,
  userId: string,
  input: ToggleSoundInput,
): Promise<PersistedGameState> {
  const state = await requireState(repo, userId);

  const next: PersistedGameState = { ...state, sound: input.enabled };
  await repo.save(userId, next);
  return next;
}