import type { AppCommand } from './commands';
import { createMission } from './createMission';
import type { ReduceResult } from './results';
import type { AppState } from './state';
import { toggleItem } from './toggleItem';

/**
 * Pure command reducer: no React, no persistence, no audio. Side effects are
 * driven by the returned events/state outside the reducer (provider's job).
 */
export function reduce(state: AppState, command: AppCommand): ReduceResult {
  switch (command.type) {
    case 'toggleItem':
      return toggleItem(state, command.missionId, command.itemId);

    case 'createMission':
      return createMission(state, command.mission);

    case 'deleteMission': {
      const missions = state.missions.filter(m => m.id !== command.missionId);
      if (missions.length === state.missions.length) return { state, events: [] };
      return {
        state: {
          ...state,
          missions,
          // Deleting the open mission closes its panel (legacy closePanel).
          selectedId: state.selectedId === command.missionId ? null : state.selectedId,
        },
        events: [],
      };
    }

    case 'selectMission':
      return { state: { ...state, selectedId: command.missionId }, events: [] };

    case 'setFilter':
      return { state: { ...state, filter: command.filter }, events: [] };

    case 'toggleSound':
      return {
        state: { ...state, sound: !state.sound },
        events: [{ type: 'soundToggled', enabled: !state.sound }],
      };

    default: {
      const unknown: never = command;
      throw new Error(`Unknown command: ${JSON.stringify(unknown)}`);
    }
  }
}
