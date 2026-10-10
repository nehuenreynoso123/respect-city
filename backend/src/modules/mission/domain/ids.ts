import type { ChecklistItem } from './types.js';

// Module-level sequence keeps ids unique inside the same millisecond.
let idSeq = 0;

export function uid(): string {
  return (
    Date.now().toString(36) +
    (idSeq++).toString(36) +
    Math.random().toString(36).slice(2, 6)
  );
}

export function it(text: string): ChecklistItem {
  return { id: uid(), text, done: false };
}