import type { RewardDelta } from '@/slices/player/domain/reward';

import { categoryOf } from './categories';
import type { Mission } from './types';

/**
 * Grant math ported from legacy completeMission() (index.html:1296-1307):
 * exp += respect, coins += ceil(respect/10), +8 to the category's stat.
 * Whether the grant happens at all (rewardGranted) is the reducer's call;
 * the stat cap (100) is applied by the player slice.
 */
export function computeMissionReward(mission: Mission): RewardDelta {
  const stat = categoryOf(mission.category).stat;
  return {
    exp: mission.respect,
    coins: Math.ceil(mission.respect / 10),
    stamina: stat === 'stamina' ? 8 : 0,
    intel: stat === 'intel' ? 8 : 0,
  };
}
