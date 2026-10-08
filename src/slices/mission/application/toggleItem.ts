import { playerReducer } from '@/slices/player/application/reducer';

import { missionDone } from '../domain/missionDone';
import { computeMissionReward } from '../domain/rewards';
import type { AppEvent } from './events';
import type { ReduceResult } from './results';
import type { AppState } from './state';

/**
 * Checklist toggle, ported from the legacy panel change handler
 * (index.html:1246-1273): completion fires only on the transition
 * not-done → done, and rewards are granted once (rewardGranted survives
 * unchecking, so re-checking celebrates but never pays again).
 */
export function toggleItem(
  state: AppState,
  missionId: string,
  itemId: string,
): ReduceResult {
  const mission = state.missions.find(m => m.id === missionId);
  if (!mission) return { state, events: [] };
  const item = mission.items.find(i => i.id === itemId);
  if (!item) return { state, events: [] };

  const before = missionDone(mission);
  const done = !item.done;
  const items = mission.items.map(i => (i.id === itemId ? { ...i, done } : i));
  const after = missionDone({ ...mission, items });

  const events: AppEvent[] = [{ type: 'itemToggled', done }];
  let player = state.player;
  let updated = { ...mission, items };

  if (!before && after) {
    const firstGrant = !mission.rewardGranted;
    if (firstGrant) {
      player = playerReducer(player, {
        type: 'rewardsGranted',
        delta: computeMissionReward(mission),
      });
    }
    updated = { ...updated, rewardGranted: true };
    events.push({
      type: 'missionCompleted',
      missionId,
      firstGrant,
      respect: mission.respect,
    });
  }

  return {
    state: {
      ...state,
      player,
      missions: state.missions.map(m => (m.id === missionId ? updated : m)),
    },
    events,
  };
}
