import type { StoragePort } from '@/slices/storage/ports/StoragePort';

/**
 * Key holding the access token. v1 stores it in localStorage (documented XSS
 * tradeoff; httpOnly refresh cookie is a v2 item).
 */
export const TOKEN_KEY = 'respect-city:token';

/**
 * StoragePort has no remove(), so clearing writes an empty string and loading
 * treats a blank value as "no token".
 */
export function loadToken(storage: StoragePort): string | null {
  const raw = storage.get(TOKEN_KEY);
  return raw !== null && raw.length > 0 ? raw : null;
}

export function saveToken(storage: StoragePort, token: string): void {
  storage.set(TOKEN_KEY, token);
}

export function clearToken(storage: StoragePort): void {
  storage.set(TOKEN_KEY, '');
}
