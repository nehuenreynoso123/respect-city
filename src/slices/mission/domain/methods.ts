/** Learning methods (how you studied): label + icon.
 * A method is a plain tag — it does NOT drive rewards or stats (that is the
 * category's job, see categories.ts). */
export const METHODS = {
  'active-recall':       { label: 'Active recall',       icon: '🎯' },
  'spaced-repetition':   { label: 'Spaced repetition',   icon: '🔁' },
  'feynman':             { label: 'Feynman technique',   icon: '🧑‍🏫' },
  'interleaving':        { label: 'Interleaving',        icon: '🔀' },
  'deliberate-practice': { label: 'Deliberate practice', icon: '🏋️' },
  'pomodoro':            { label: 'Pomodoro',            icon: '🍅' },
} as const;

export type MethodKey = keyof typeof METHODS;
export type MethodInfo = (typeof METHODS)[MethodKey];

/** Methods are optional; unknown/absent values have no info. */
export function methodOf(method: string | undefined | null): MethodInfo | null {
  if (!method) return null;
  return METHODS[method as MethodKey] ?? null;
}
