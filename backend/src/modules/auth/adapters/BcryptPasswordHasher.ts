import bcrypt from 'bcryptjs';

import type { PasswordHasher } from '../ports/PasswordHasher.js';

const ROUNDS = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return await bcrypt.hash(plain, ROUNDS);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(plain, hash);
  }
}
