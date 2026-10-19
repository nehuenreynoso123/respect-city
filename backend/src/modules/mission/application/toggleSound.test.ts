import { describe, expect, it } from 'vitest';

import { fakeStateRepository } from '../../../test-support/fakeStateRepository.js';
import type { PersistedGameState } from '../../state/ports/StateRepository.js';
import { toggleSound } from './toggleSound.js';

const state = (sound: boolean): PersistedGameState => ({
  player: { exp: 0, stamina: 0, intel: 0, coins: 0 },
  missions: [],
  sound,
  routineSeeded: 0,
});

describe('toggleSound', () => {
  it('sets sound to false and persists it', async () => {
    const repo = fakeStateRepository(state(true));
    const result = await toggleSound(repo, 'u1', { enabled: false });

    expect(result.sound).toBe(false);
    expect(repo.saved).toHaveLength(1);
    expect(repo.current).toEqual(result);
  });

  it('sets sound to true', async () => {
    const repo = fakeStateRepository(state(false));
    const result = await toggleSound(repo, 'u1', { enabled: true });
    expect(result.sound).toBe(true);
  });

  it('fails with 404 when the account has no state', async () => {
    await expect(
      toggleSound(fakeStateRepository(null), 'u1', { enabled: true }),
    ).rejects.toMatchObject({ code: 'state-not-found', statusCode: 404 });
  });
});