import { DomainError } from '../../../shared/domain/errors.js';
import { normalizeEmail, validateEmailAndPassword } from '../domain/user.js';
import type { PasswordHasher } from '../ports/PasswordHasher.js';
import type { TokenService } from '../ports/TokenService.js';
import type { UserRepository } from '../ports/UserRepository.js';

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: { id: string; email: string };
  accessToken: string;
}

export interface LoginDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

export async function login(
  deps: LoginDeps,
  input: LoginInput,
): Promise<AuthResponse> {
  const email = normalizeEmail(input.email);
  validateEmailAndPassword(email, input.password);

  const user = await deps.userRepository.findByEmail(email);
  if (!user) {
    throw new DomainError('invalid-credentials', 'Invalid email or password.', 401);
  }

  const valid = await deps.passwordHasher.verify(input.password, user.passwordHash);
  if (!valid) {
    throw new DomainError('invalid-credentials', 'Invalid email or password.', 401);
  }

  const accessToken = deps.tokenService.sign(user.id);

  return { user: { id: user.id, email: user.email }, accessToken };
}
