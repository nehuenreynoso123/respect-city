import { apiErrorFrom } from '@/shared/http/ApiError';

import type { AuthResponse, User } from '../domain/types';
import type { AuthRepository, Credentials } from '../ports/AuthRepository';

/**
 * fetch-based AuthRepository. The session lives entirely in an httpOnly
 * cookie, so every request is sent `credentials: 'same-origin'` and the app
 * never sees or attaches the token itself.
 */
export class HttpAuthAdapter implements AuthRepository {
  constructor(private readonly baseUrl: string) {}

  register(input: Credentials): Promise<AuthResponse> {
    return this.post('/api/auth/register', input);
  }

  login(input: Credentials): Promise<AuthResponse> {
    return this.post('/api/auth/login', input);
  }

  async me(): Promise<{ user: User }> {
    const response = await fetch(`${this.baseUrl}/api/me`, {
      credentials: 'same-origin',
    });
    if (!response.ok) throw await apiErrorFrom(response);
    return (await response.json()) as { user: User };
  }

  async logout(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (!response.ok) throw await apiErrorFrom(response);
  }

  private async post(path: string, body: Credentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await apiErrorFrom(response);
    return (await response.json()) as AuthResponse;
  }
}
