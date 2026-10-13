import { STAT_CAP } from '../domain/player.js';
import type { Player } from '../domain/player.js';
import type { RewardDelta } from '../domain/reward.js';

/**
 * Applies a grant exactly like the frontend playerReducer's `rewardsGranted`
 * event: exp/coins add up without limit, stamina/intel cap at 100, and
 * untouched stats are left alone (legacy never rewrites attributes it does
 * not grant). Ported from src/slices/player/application/reducer.ts.
 */
export function applyRewards(player: Player, delta: RewardDelta): Player {
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
