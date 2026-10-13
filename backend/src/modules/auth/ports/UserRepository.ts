import type { User } from '../domain/user.js';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}
