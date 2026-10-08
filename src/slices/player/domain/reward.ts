/**
 * Raw attribute grant produced by completing a mission. Mission rules compute
 * it; the player slice applies it (that is where the stat cap lives).
 */
export interface RewardDelta {
  exp: number;
  coins: number;
  stamina: number;
  intel: number;
}
