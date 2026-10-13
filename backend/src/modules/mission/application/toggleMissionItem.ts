import { applyRewards } from '../../player/application/applyRewards.js';
import { DomainError } from '../../../shared/domain/errors.js';
import { missionDone } from '../domain/missionDone.js';
import { computeMissionReward } from '../domain/rewards.js';
import type { Mission } from '../domain/types.js';
import type { PersistedGameState, StateRepository } from '../../state/ports/StateRepository.js';
import { requireState } from './requireState.js';

/**
 * Checklist toggle, ported EXACTLY from the frontend toggleItem: completion
 * fires only on the transition not-done → done, and rewards are granted once
 * (rewardGranted survives unchecking, so re-checking celebrates but never pays
 * again). This is the anti-cheat core — the reward is computed from the
 * ORIGINAL mission (pre-toggle) so a grind cannot re-roll stats by toggling.
 */
export async function toggleMissionItem(
  repo: StateRepository,
  userId: string,
  missionId: string,
  itemId: string,
): Promise<PersistedGameState> {
  const state = await requireState(repo, userId);

  const mission = state.missions.find(m => m.id === missionId);
  if (!mission) {
    throw new DomainError('not-found', 'Mission not found.', 404);
  }
  const item = mission.items.find(i => i.id === itemId);
  if (!item) {
    throw new DomainError('not-found', 'Checklist item not found.', 404);
  }

  const before = missionDone(mission);
  const done = !item.done;
  const items = mission.items.map(i => (i.id === itemId ? { ...i, done } : i));
  const after = missionDone({ ...mission, items });

  let player = state.player;
  let updated: Mission = { ...mission, items };

  if (!before && after) {
    const firstGrant = !mission.rewardGranted;
    if (firstGrant) {
      player = applyRewards(player, computeMissionReward(mission));
    }
    updated = { ...updated, rewardGranted: true };
  }

  const next: PersistedGameState = {
    ...state,
    player,
    missions: state.missions.map(m => (m.id === missionId ? updated : m)),
  };
  await repo.save(userId, next);
  return next;
}