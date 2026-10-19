import { clamp } from '../../player/domain/player.js';
import { DomainError } from '../../../shared/domain/errors.js';
import type { CategoryKey } from '../domain/categories.js';
import type { MethodKey } from '../domain/methods.js';
import type { Mission } from '../domain/types.js';
import type { PersistedGameState, StateRepository } from '../../state/ports/StateRepository.js';
import { requireState } from './requireState.js';

export interface CreateMissionInput {
  id: string;
  title: string;
  category: CategoryKey;
  x: number | null;
  y: number | null;
  /** Form values arrive as strings; legacy parses with parseInt(...) || 100. */
  respect: number | string;
  items: { id: string; text: string }[];
  method?: MethodKey;
}

/**
 * Save flow ported from the frontend createMission (legacy btn-save handler):
 * normalize first (trim, drop empty rows, clamp respect), then validate in the
 * same order with the same messages. Missions are appended without a
 * rewardGranted flag (undefined) and persisted as the full aggregate.
 */
export async function createMission(
  repo: StateRepository,
  userId: string,
  input: CreateMissionInput,
): Promise<PersistedGameState> {
  const state = await requireState(repo, userId);

  const title = input.title.trim();
  const items = input.items
    .filter(i => i.text.trim())
    .map(i => ({ id: i.id, text: i.text.trim(), done: false }));
  const respect = clamp(parseInt(String(input.respect), 10) || 100, 10, 9999);

  if (!title) {
    throw new DomainError('missing-title', 'Give the mission a title.', 400);
  }
  if (!items.length) {
    throw new DomainError('missing-items', 'Add at least one checklist item.', 400);
  }
  // Legacy checks only x, but x/y are always set together from the map.
  if (input.x == null || input.y == null) {
    throw new DomainError('missing-location', 'Pick a location on the map first.', 400);
  }

  const mission: Mission = {
    id: input.id,
    title,
    category: input.category,
    x: input.x,
    y: input.y,
    respect,
    items,
    method: input.method,
  };

  const next: PersistedGameState = { ...state, missions: [...state.missions, mission] };
  await repo.save(userId, next);
  return next;
}
