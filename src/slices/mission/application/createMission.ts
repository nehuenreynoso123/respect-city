import { clamp } from '@/slices/player/domain/player';

import type { Mission } from '../domain/types';
import type { MissionInput } from './commands';
import type { ReduceResult } from './results';
import type { AppState } from './state';

/**
 * Save flow ported from the legacy btn-save handler (index.html:1487-1506):
 * normalize first (trim, drop empty rows, clamp respect), then validate in
 * the same order with the same alert messages.
 */
export function createMission(state: AppState, input: MissionInput): ReduceResult {
  const title = input.title.trim();
  const items = input.items
    .filter(i => i.text.trim())
    .map(i => ({ id: i.id, text: i.text.trim(), done: false }));
  const respect = clamp(parseInt(String(input.respect), 10) || 100, 10, 9999);

  if (!title) {
    return {
      state,
      events: [],
      error: { code: 'missing-title', message: 'Give the mission a title.' },
    };
  }
  if (!items.length) {
    return {
      state,
      events: [],
      error: { code: 'missing-items', message: 'Add at least one checklist item.' },
    };
  }
  // Legacy checks only x, but x/y are always set together from the map.
  if (input.x == null || input.y == null) {
    return {
      state,
      events: [],
      error: { code: 'missing-location', message: 'Pick a location on the map first.' },
    };
  }

  const mission: Mission = {
    id: input.id,
    title,
    category: input.category,
    x: input.x,
    y: input.y,
    respect,
    items,
  };
  return { state: { ...state, missions: [...state.missions, mission] }, events: [] };
}
