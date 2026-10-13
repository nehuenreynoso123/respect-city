import type { MissionRepository } from '../ports/MissionRepository';
import { mergeRoutine } from '../routine';
import { alignMapPositions } from './alignMapPositions';
import { freshAppState, persistedOf } from './state';
import type { AppState } from './state';

/**
 * Boot flow ported from legacy load() (index.html:835-852): missing or
 * corrupt data → demo missions + routine; older saves gain the routine
 * blocks once per ROUTINE_VERSION. The map-layout migration then realigns
 * app-owned missions to the current world design. Persists only when the
 * state actually changed (legacy mergeRoutine is the sole save in that path).
 */
export function loadInitialState(repo: MissionRepository): AppState {
  const loaded = repo.load();
  const base: AppState = loaded
    ? { ...loaded, selectedId: null, filter: 'all' }
    : freshAppState();
  const merged = alignMapPositions(mergeRoutine(base));
  if (loaded === null || merged !== base) repo.save(persistedOf(merged));
  return merged;
}
