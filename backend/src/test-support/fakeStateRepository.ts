import type { PersistedGameState, StateRepository } from '../modules/state/ports/StateRepository.js';

/**
 * In-memory StateRepository double for application tests: seeded with an
 * initial aggregate, records every save() and mirrors it so findByUser()
 * reflects the persisted blob exactly like the real adapter does.
 */
export interface FakeStateRepository extends StateRepository {
  /** Aggregates passed to save(), in order. */
  saved: PersistedGameState[];
  /** Current in-memory aggregate (null until created/seeded). */
  current: PersistedGameState | null;
}

export function fakeStateRepository(
  initial: PersistedGameState | null = null,
): FakeStateRepository {
  let state = initial;
  const saved: PersistedGameState[] = [];
  return {
    saved,
    get current() {
      return state;
    },
    async findByUser() {
      return state;
    },
    async create(_userId, next) {
      state = next;
    },
    async save(_userId, next) {
      state = next;
      saved.push(next);
    },
  };
}