/**
 * Synthetic UI sounds. Callers gate on the persisted `sound` flag before
 * invoking (legacy tone() checks state.sound itself — same contract).
 */
export interface SfxPort {
  checkOn(): void;
  checkOff(): void;
  respect(): void;
}
