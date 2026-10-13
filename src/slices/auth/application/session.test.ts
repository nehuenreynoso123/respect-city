import { describe, expect, it } from 'vitest';

import type { StoragePort } from '@/slices/storage/ports/StoragePort';

import { TOKEN_KEY, clearToken, loadToken, saveToken } from './session';

class FakeStorage implements StoragePort {
  readonly map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('auth token session', () => {
  it('loads null when nothing is stored', () => {
    expect(loadToken(new FakeStorage())).toBeNull();
  });

  it('saves and loads the token under TOKEN_KEY', () => {
    const storage = new FakeStorage();
    saveToken(storage, 'jwt-123');

    expect(storage.map.get(TOKEN_KEY)).toBe('jwt-123');
    expect(loadToken(storage)).toBe('jwt-123');
  });

  it('clears a stored token back to null', () => {
    const storage = new FakeStorage();
    saveToken(storage, 'jwt-123');

    clearToken(storage);

    expect(loadToken(storage)).toBeNull();
  });

  it('treats a blank stored value as no token', () => {
    const storage = new FakeStorage();
    storage.set(TOKEN_KEY, '');
    expect(loadToken(storage)).toBeNull();
  });
});
