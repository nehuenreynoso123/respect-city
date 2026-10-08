import type { AppEvent } from './events';
import type { AppState } from './state';

export type ReduceError =
  | { code: 'missing-title'; message: string }
  | { code: 'missing-items'; message: string }
  | { code: 'missing-location'; message: string };

export interface ReduceResult {
  /** Same reference as the input when the command changed nothing. */
  state: AppState;
  events: AppEvent[];
  /** Present when the command was rejected; state is then unchanged. */
  error?: ReduceError;
}
