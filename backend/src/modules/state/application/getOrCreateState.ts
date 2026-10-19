import { emptyPlayer } from '../../player/domain/player.js';
import { mergeRoutine, seedMissions } from '../../mission/domain/routine.js';
import type { PersistedGameState, StateRepository } from '../ports/StateRepository.js';

/**
 * Loads the account's game state, seeding demo + routine missions on first
 * access (mirrors the frontend boot: seedMissions() then mergeRoutine()).
 *
 * Routine injection runs on EVERY read like the front's load; mergeRoutine is
 * pure and returns the SAME reference when routineSeeded is already current, so
 * the aggregate is persisted only when the routine actually changed.
 */
export async function getOrCreateState(
  repo: StateRepository,
  userId: string,
): Promise<PersistedGameState> {
  const state = await repo.findByUser(userId);
  if (state) {
    const merged = mergeRoutine(state);
    if (merged !== state) {
      await repo.save(userId, merged);
    }
    return merged;
  }

  const seeded = mergeRoutine({
    player: emptyPlayer(),
    missions: seedMissions(),
    sound: true,
    routineSeeded: 0,
  });
  await repo.create(userId, seeded);
  return seeded;
}
