/** Minimal string key-value store — lets tests inject an in-memory fake. */
export interface StoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
