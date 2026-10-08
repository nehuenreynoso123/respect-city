import type { CategoryKey } from '@/slices/mission/domain/categories';
import type { MissionInput } from '@/slices/mission/application/commands';
import { it, uid } from '@/slices/mission/domain/ids';

/** Draft edited inside the create modal (legacy `ui.draft`, index.html:1397-1405). */
export interface MissionDraft {
  title: string;
  category: CategoryKey;
  /** Raw input value; normalized by createMission on dispatch (legacy parses on save). */
  respect: string;
  x: number | null;
  y: number | null;
  items: { id: string; text: string }[];
}

/** Fresh draft for openCreateModal: `at` = optional world coords (rounded like legacy). */
export function emptyDraft(at?: { x: number; y: number } | null): MissionDraft {
  return {
    title: '',
    category: 'gym',
    respect: '100',
    x: at ? Math.round(at.x) : null,
    y: at ? Math.round(at.y) : null,
    items: [it('')],
  };
}

export type DraftValidation =
  | { ok: true; input: MissionInput }
  | { ok: false; message: string; focusTitle: boolean };

/**
 * Save-time validation ported from the legacy btn-save handler
 * (index.html:1487-1496): normalize first, then the same checks in the
 * same order with the same alert messages. The application layer runs the
 * same rules again on dispatch — defence in depth, matching legacy which
 * validated in the handler before pushing.
 */
export function validateDraft(draft: MissionDraft): DraftValidation {
  const title = draft.title.trim();
  const items = draft.items
    .filter((i) => i.text.trim())
    .map((i) => ({ id: i.id, text: i.text.trim() }));

  if (!title) {
    return { ok: false, message: 'Give the mission a title.', focusTitle: true };
  }
  if (!items.length) {
    return { ok: false, message: 'Add at least one checklist item.', focusTitle: false };
  }
  if (draft.x == null || draft.y == null) {
    return { ok: false, message: 'Pick a location on the map first.', focusTitle: false };
  }

  return {
    ok: true,
    input: {
      id: uid(),
      title,
      category: draft.category,
      x: draft.x,
      y: draft.y,
      respect: draft.respect,
      items,
    },
  };
}
