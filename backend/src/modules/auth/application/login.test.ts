import { describe, expect, it, vi } from 'vitest';

import { login } from './login.js';

const fakeRepo = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
};

const fakeHasher = {
  hash: vi.fn(),
  verify: vi.fn(),
};

const fakeToken = {
  sign: vi.fn(),
  verify: vi.fn(),
};

describe('login', () => {
  it('success', async () => {
    fakeRepo.findByEmail.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'hashed_pw' });
    fakeHasher.verify.mockResolvedValue(true);
    fakeToken.sign.mockReturnValue('token123');

    const result = await login(
      { userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken },
      { email: 'test@example.com', password: 'password123' },
    );

    expect(result.user).toEqual({ id: 'u1', email: 'test@example.com' });
    expect(result.accessToken).toBe('token123');
  });

  it('wrong password -> invalid-credentials', async () => {
    fakeRepo.findByEmail.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'hashed_pw' });
    fakeHasher.verify.mockResolvedValue(false);

    await expect(
      login(
        { userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken },
        { email: 'test@example.com', password: 'wrongpass' },
      ),
    ).rejects.toMatchObject({ code: 'invalid-credentials' });
  });

  it('unknown email -> invalid-credentials', async () => {
    fakeRepo.findByEmail.mockResolvedValue(null);

    await expect(
      login(
        { userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken },
        { email: 'unknown@example.com', password: 'password123' },
      ),
    ).rejects.toMatchObject({ code: 'invalid-credentials' });
  });
});
