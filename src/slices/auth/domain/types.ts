export interface User {
  id: string;
  email: string;
}

/**
 * Payload returned by `POST /api/auth/register` and `/login`. The session
 * token is no longer part of the client contract: login sets an httpOnly
 * cookie and only the user travels in the body.
 */
export interface AuthResponse {
  user: User;
}
