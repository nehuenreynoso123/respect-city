import type { StoragePort } from '../ports/StoragePort';

/**
 * window.localStorage behind StoragePort. Failure handling mirrors the
 * legacy save()/load(): writes warn and continue, read errors surface as
 * null so the app seeds fresh data instead of crashing.
 */
export class LocalStorageAdapter implements StoragePort {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage unavailable, progress will not persist:', e);
    }
  }
}
