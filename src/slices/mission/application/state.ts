import { emptyPlayer } from '@/slices/player/domain/player';
import type { Player } from '@/slices/player/domain/player';

import type { Mission } from '../domain/types';

/** Persisted state is the wire contract shared with the server (see /api/state). */
export interface PersistedState {
  player: Player;
  missions: Mission[];
  sound: boolean;
  routineSeeded: number;
}

export type Filter = 'all' | 'active' | 'done';

/** Persisted state plus non-persisted UI state (legacy `ui`). */
export interface AppState extends PersistedState {
  selectedId: string | null;
  filter: Filter;
}

/** Strips UI-only fields so JSON output matches the legacy blob exactly. */
export function persistedOf(state: AppState): PersistedState {
  return {
    player: state.player,
    missions: state.missions,
    sound: state.sound,
    routineSeeded: state.routineSeeded,
  };
}

/** Boot state before any data loads: defaults with no missions until the server state arrives. */
export function freshAppState(): AppState {
  return {
    player: emptyPlayer(),
    missions: [],
    sound: true,
    routineSeeded: 0,
    selectedId: null,
    filter: 'all',
  };
}
