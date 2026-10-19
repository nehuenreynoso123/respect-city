import type { MissionInput } from '../application/commands';
import type { PersistedState } from '../application/state';

/**
 * Authoritative game API. Every mutation returns the whole server state, which
 * the client adopts wholesale (restriction 5: no merge logic in the client).
 */
export interface GameRepository {
  /** GET /api/state — the server seeds demo + routine on first access. */
  load(): Promise<PersistedState>;
  createMission(input: MissionInput): Promise<PersistedState>;
  deleteMission(missionId: string): Promise<PersistedState>;
  toggleItem(missionId: string, itemId: string): Promise<PersistedState>;
  toggleSound(enabled: boolean): Promise<PersistedState>;
}
