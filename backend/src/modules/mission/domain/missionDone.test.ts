import { describe, expect, it } from 'vitest';

import { missionDone } from './missionDone.js';
import type { Mission } from './types.js';

const mission = (items: Mission['items']): Mission => ({
  id: 'm1',
  title: 'Test',
  category: 'gym',
  x: 0,
  y: 0,
  respect: 100,
  items,
});

describe('missionDone', () => {
  it('an empty checklist is never done', () => {
    expect(missionDone(mission([]))).toBe(false);
  });

  it('mixed items are not done', () => {
    expect(
      missionDone(
        mission([
          { id: 'a', text: 'one', done: true },
          { id: 'b', text: 'two', done: false },
        ]),
      ),
    ).toBe(false);
  });

  it('all items done means done', () => {
    expect(
      missionDone(
        mission([
          { id: 'a', text: 'one', done: true },
          { id: 'b', text: 'two', done: true },
        ]),
      ),
    ).toBe(true);
  });

  it('a single checked item is enough', () => {
    expect(missionDone(mission([{ id: 'a', text: 'only', done: true }]))).toBe(true);
  });
});