import type { PrismaClient } from '@prisma/client';

import type { User } from '../domain/user.js';
import type { CreateUserInput, UserRepository } from '../ports/UserRepository.js';

export type UserDb = Pick<PrismaClient, 'user'>;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: UserDb) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { email } });
    if (!row) return null;
    return { id: row.id, email: row.email, passwordHash: row.passwordHash };
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    if (!row) return null;
    return { id: row.id, email: row.email, passwordHash: row.passwordHash };
  }

  async create(input: CreateUserInput): Promise<User> {
    const row = await this.db.user.create({
      data: { email: input.email, passwordHash: input.passwordHash },
    });
    return { id: row.id, email: row.email, passwordHash: row.passwordHash };
  }
}
