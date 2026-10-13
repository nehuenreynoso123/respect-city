import type { Mission } from '../domain/types';
import { canonicalPositions } from '../routine';

/**
 * Map-layout migration. The city map was reshaped (two landmasses, a central
 * bay, the beach island); app-owned missions — the demo seeds and the routine
 * blocks — carry fixed world coordinates, so after the redesign their persisted
 * `x`/`y` may point into what is now water. Realign each by title to its
 * canonical position. User-created missions have no canonical position and are
 * left exactly as they are (progress included).
 *
 * Pure and idempotent: returns the same reference when nothing moved, so the
 * caller (loadInitialState) skips the persist — matching the legacy "save only
 * when the state actually changed" rule.
 */
export function alignMapPositions<T extends { missions: Mission[] }>(state: T): T {
  const positions = canonicalPositions();
  let changed = false;
  const missions = state.missions.map((mission) => {
    const canonical = positions.get(mission.title);
    if (!canonical || (mission.x === canonical.x && mission.y === canonical.y)) {
      return mission;
    }
    changed = true;
    return { ...mission, x: canonical.x, y: canonical.y };
  });
  return changed ? { ...state, missions } : state;
}
