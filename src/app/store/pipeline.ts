import type { AppCommand } from '@/slices/mission/application/commands';
import type { PersistedState } from '@/slices/mission/application/state';
import type { GameRepository } from '@/slices/mission/ports/GameRepository';

/** Commands that only touch local UI state; they never reach the network. */
export type LocalCommand = Extract<AppCommand, { type: 'selectMission' | 'setFilter' }>;

export function isLocalCommand(command: AppCommand): command is LocalCommand {
  return command.type === 'selectMission' || command.type === 'setFilter';
}

/** A mutation command mapped to its authoritative API round-trip. */
export interface MutationPlan {
  /** Pre-command state, kept for rollback on failure. */
  snapshot: PersistedState;
  run: () => Promise<PersistedState>;
}

/**
 * Maps a mutation command to its API call. `snapshot` is the PRE-command state,
 * so `toggleSound` reads the flag the reducer just flipped (the new value is
 * `!snapshot.sound`). Returns null for local-only commands and `replaceState`
 * (which is applied directly, never sent).
 *
 * Kept free of React so the tricky optimistic mapping is unit-testable.
 */
export function mutationOf(
  repo: GameRepository,
  command: AppCommand,
  snapshot: PersistedState,
): MutationPlan | null {
  switch (command.type) {
    case 'toggleItem':
      return { snapshot, run: () => repo.toggleItem(command.missionId, command.itemId) };
    case 'createMission':
      return { snapshot, run: () => repo.createMission(command.mission) };
    case 'deleteMission':
      return { snapshot, run: () => repo.deleteMission(command.missionId) };
    case 'toggleSound':
      return { snapshot, run: () => repo.toggleSound(!snapshot.sound) };
    default:
      return null;
  }
}
