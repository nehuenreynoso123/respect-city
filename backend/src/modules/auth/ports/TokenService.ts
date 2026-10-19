export interface TokenPayload {
  userId: string;
}

export interface TokenService {
  sign(userId: string): string;
  verify(token: string): TokenPayload;
}
