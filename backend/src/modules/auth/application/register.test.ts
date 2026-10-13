import { describe, expect, it, vi } from 'vitest';

import { DomainError } from '../../../shared/domain/errors.js';
import { register } from './register.js';

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

describe('register', () => {
  it('success: returns user and token, hash not plaintext', async () => {
    fakeRepo.findByEmail.mockResolvedValue(null);
    fakeHasher.hash.mockResolvedValue('hashed_pw');
    fakeRepo.create.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'hashed_pw' });
    fakeToken.sign.mockReturnValue('token123');

    const result = await register(
      { userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken },
      { email: 'Test@Example.com', password: 'password123' },
    );

    expect(result.user).toEqual({ id: 'u1', email: 'test@example.com' });
    expect(result.accessToken).toBe('token123');
    expect(fakeHasher.hash).toHaveBeenCalledWith('password123');
    expect(fakeRepo.create).toHaveBeenCalledWith({ email: 'test@example.com', passwordHash: 'hashed_pw' });
  });

  it('duplicate email -> email-taken', async () => {
    fakeRepo.findByEmail.mockResolvedValue({ id: 'u1', email: 'test@example.com', passwordHash: 'h' });
    await expect(
      register(
        { userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken },
        { email: 'test@example.com', password: 'password123' },
      ),
    ).rejects.toThrowError(DomainError);
  });

  it('invalid email -> validation', async () => {
    await expect(
      register(
        { userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken },
        { email: 'bad', password: 'password123' },
      ),
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('short password -> validation', async () => {
    await expect(
      register(
        { userRepository: fakeRepo, passwordHasher: fakeHasher, tokenService: fakeToken },
        { email: 'test@example.com', password: 'short' },
      ),
    ).rejects.toMatchObject({ code: 'validation' });
  });
});
