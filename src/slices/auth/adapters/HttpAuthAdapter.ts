import { apiErrorFrom } from '@/shared/http/ApiError';

import type { AuthResponse, User } from '../domain/types';
import type { AuthRepository, Credentials } from '../ports/AuthRepository';

/**
 * fetch-based AuthRepository. `getToken` is read on every call (not captured),
 * so a token saved right after login is attached to the next request without
 * rebuilding the adapter.
 */
export class HttpAuthAdapter implements AuthRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => string | null,
  ) {}

  register(input: Credentials): Promise<AuthResponse> {
    return this.post('/api/auth/register', input);
  }

  login(input: Credentials): Promise<AuthResponse> {
    return this.post('/api/auth/login', input);
  }

  async me(): Promise<{ user: User }> {
    const response = await fetch(`${this.baseUrl}/api/me`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) throw await apiErrorFrom(response);
    return (await response.json()) as { user: User };
  }

  private async post(path: string, body: Credentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await apiErrorFrom(response);
    return (await response.json()) as AuthResponse;
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
