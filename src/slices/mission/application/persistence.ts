import { emptyPlayer } from '@/slices/player/domain/player';

import type { Mission } from '../domain/types';
import type { PersistedState } from './state';

/** Legacy localStorage key — changing it would strand user data. */
export const STORAGE_KEY = 'vice-tasks:v1';

/**
 * Parse the legacy `vice-tasks:v1` blob with the same shallow defaults as
 * load() (index.html:835-852): older saves gain missing fields, mission
 * objects pass through untouched (rewardGranted survives), and anything
 * that throws — including a `null` payload — returns null so the caller
 * seeds fresh data, exactly like the legacy catch branch.
 */
export function parsePersistedState(raw: string): PersistedState | null {
  try {
    const parsed = JSON.parse(raw);
    // Direct property access is deliberate: it throws for null like legacy.
    const source = parsed as Partial<PersistedState>;
    return {
      player: { ...emptyPlayer(), ...(source.player || {}) },
      missions: Array.isArray(source.missions) ? (source.missions as Mission[]) : [],
      sound: typeof source.sound === 'boolean' ? source.sound : true,
      routineSeeded:
        typeof source.routineSeeded === 'number' ? source.routineSeeded : 0,
    };
  } catch {
    return null;
  }
}

/** Field order matches the legacy state literal so blobs stay comparable. */
export function serializePersistedState(state: PersistedState): string {
  return JSON.stringify({
    player: state.player,
    missions: state.missions,
    sound: state.sound,
    routineSeeded: state.routineSeeded,
  });
}
