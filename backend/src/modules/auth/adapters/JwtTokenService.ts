import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

import type { TokenPayload, TokenService } from '../ports/TokenService.js';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(userId: string): string {
    const options: SignOptions = { expiresIn: this.expiresIn as SignOptions['expiresIn'] };
    return jwt.sign({ userId }, this.secret as Secret, options);
  }

  verify(token: string): TokenPayload {
    const payload = jwt.verify(token, this.secret as Secret) as TokenPayload;
    return { userId: payload.userId };
  }
}
