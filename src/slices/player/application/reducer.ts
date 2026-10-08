import { STAT_CAP } from '../domain/player';
import type { Player } from '../domain/player';
import type { RewardDelta } from '../domain/reward';

export type PlayerEvent = { type: 'rewardsGranted'; delta: RewardDelta };

/**
 * Applies a grant exactly like legacy completeMission(): exp/coins add up
 * without limit, stamina/intel cap at 100, and untouched stats are left
 * alone (legacy never rewrites attributes it does not grant).
 */
export function playerReducer(player: Player, event: PlayerEvent): Player {
  switch (event.type) {
    case 'rewardsGranted': {
      const { delta } = event;
      const next: Player = {
        ...player,
        exp: player.exp + delta.exp,
        coins: player.coins + delta.coins,
      };
      if (delta.stamina > 0) {
        next.stamina = Math.min(STAT_CAP, player.stamina + delta.stamina);
      }
      if (delta.intel > 0) {
        next.intel = Math.min(STAT_CAP, player.intel + delta.intel);
      }
      return next;
    }
    default: {
      // PlayerEvent is a single-member type, so TS cannot narrow it to never
      // here the way it does for the mission command union.
      throw new Error(`Unknown player event: ${JSON.stringify(event)}`);
    }
  }
}
