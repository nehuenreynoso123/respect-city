export interface User {
  id: string;
  email: string;
}

/** Payload returned by `POST /api/auth/register` and `/login`. */
export interface AuthResponse {
  user: User;
  accessToken: string;
}
