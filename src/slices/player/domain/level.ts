/** EXP needed per level (legacy EXP_PER_LEVEL). */
export const EXP_PER_LEVEL = 500;

export const levelOf = (exp: number): number =>
  Math.floor(exp / EXP_PER_LEVEL) + 1;

export const inLevelExp = (exp: number): number => exp % EXP_PER_LEVEL;

/** EXP bar percentage 0..100 (legacy renders it with one decimal). */
export const expBarPercent = (exp: number): number =>
  (inLevelExp(exp) / EXP_PER_LEVEL) * 100;
