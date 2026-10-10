import type { Mission } from '../../mission/domain/types.js';
import type { Player } from '../../player/domain/player.js';

/**
 * The game state owned by one account: exactly the legacy `vice-tasks:v1`
 * persisted slice (player + missions). The frontend and the API both treat it
 * as a single blob, so the aggregate is persisted (and replaced) atomically.
 */
export interface PersistedGameState {
  player: Player;
  missions: Mission[];
}

export interface StateRepository {
  /** Null when the account has no state yet (before first seed). */
  findByUser(userId: string): Promise<PersistedGameState | null>;

  /** Create the player row and seed missions in one transaction. */
  create(userId: string, state: PersistedGameState): Promise<void>;

  /**
   * Replace the whole aggregate atomically: upsert player, upsert kept
   * missions/items, delete missions missing from the state (cascade items).
   * Created-at timestamps of kept missions survive (upsert, not recreate).
   */
  save(userId: string, state: PersistedGameState): Promise<void>;
}