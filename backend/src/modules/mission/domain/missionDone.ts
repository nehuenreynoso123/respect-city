import type { Mission } from './types.js';

/** A mission counts as done only with at least one item, all checked. */
export const missionDone = (m: Mission): boolean =>
  m.items.length > 0 && m.items.every(i => i.done);