import type { AuthResponse, User } from '../domain/types';

export interface Credentials {
  email: string;
  password: string;
}

/** Auth use cases the UI drives; the adapter owns the HTTP details. */
export interface AuthRepository {
  register(input: Credentials): Promise<AuthResponse>;
  login(input: Credentials): Promise<AuthResponse>;
  /** Validates the bearer token held by the adapter and returns the user. */
  me(): Promise<{ user: User }>;
}
