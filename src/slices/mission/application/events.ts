/**
 * Side-effect intents returned by the reducer. The reducer never plays sound
 * or persists: the provider runs these after dispatch (legacy wiring):
 * - itemToggled → sfxCheck(done)
 * - missionCompleted → showRespect overlay + sfxRespect()
 * - soundToggled(enabled) → enable chime (legacy only when turning on)
 */
export type AppEvent =
  | { type: 'itemToggled'; done: boolean }
  | {
      type: 'missionCompleted';
      missionId: string;
      /** false → overlay says "REWARD ALREADY CLAIMED". */
      firstGrant: boolean;
      respect: number;
    }
  | { type: 'soundToggled'; enabled: boolean };
