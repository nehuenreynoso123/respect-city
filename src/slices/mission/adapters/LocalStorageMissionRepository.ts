import type { StoragePort } from '@/slices/storage/ports/StoragePort';

import {
  STORAGE_KEY,
  parsePersistedState,
  serializePersistedState,
} from '../application/persistence';
import type { PersistedState } from '../application/state';
import type { MissionRepository } from '../ports/MissionRepository';

/** Persists the whole app blob under the legacy key via a StoragePort. */
export class LocalStorageMissionRepository implements MissionRepository {
  constructor(private readonly storage: StoragePort) {}

  load(): PersistedState | null {
    const raw = this.storage.get(STORAGE_KEY);
    if (raw == null) return null;
    return parsePersistedState(raw);
  }

  save(state: PersistedState): void {
    this.storage.set(STORAGE_KEY, serializePersistedState(state));
  }
}
