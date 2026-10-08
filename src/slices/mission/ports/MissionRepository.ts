import type { PersistedState } from '../application/state';

/** Read/write of the persisted app blob (legacy `vice-tasks:v1`). */
export interface MissionRepository {
  /** null when nothing is stored or the stored blob is unreadable. */
  load(): PersistedState | null;
  save(state: PersistedState): void;
}
