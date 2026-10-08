/** Player attributes persisted in the legacy `vice-tasks:v1` blob. */
export interface Player {
  exp: number;
  stamina: number;
  intel: number;
  coins: number;
}

/** Hard cap for stamina/intel. Coins are uncapped — legacy caps only these two. */
export const STAT_CAP = 100;

/** Coin bar soft cap — display only (legacy COIN_BAR_MAX). */
export const COIN_BAR_MAX = 500;

export function emptyPlayer(): Player {
  return { exp: 0, stamina: 0, intel: 0, coins: 0 };
}

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));
