import type { AuthResponse, User } from '../domain/types';

export interface Credentials {
  email: string;
  password: string;
}

/** Auth use cases the UI drives; the adapter owns the HTTP details. */
export interface AuthRepository {
  register(input: Credentials): Promise<AuthResponse>;
  login(input: Credentials): Promise<AuthResponse>;
  /** Validates the session cookie and returns the user (401 when absent/expired). */
  me(): Promise<{ user: User }>;
  /**
   * Clears the session cookie server-side. Safe to call without a valid
   * session; callers may ignore network failures since the local session is
   * torn down regardless.
   */
  logout(): Promise<void>;
}
