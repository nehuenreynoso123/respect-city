import { describe, expect, it } from 'vitest';

import { BcryptPasswordHasher } from './BcryptPasswordHasher.js';

describe('BcryptPasswordHasher', () => {
  it('verify returns true for correct password', async () => {
    const hasher = new BcryptPasswordHasher();
    const hash = await hasher.hash('password123');
    const result = await hasher.verify('password123', hash);
    expect(result).toBe(true);
  });

  it('verify returns false for wrong password', async () => {
    const hasher = new BcryptPasswordHasher();
    const hash = await hasher.hash('password123');
    const result = await hasher.verify('wrongpass', hash);
    expect(result).toBe(false);
  });
});
