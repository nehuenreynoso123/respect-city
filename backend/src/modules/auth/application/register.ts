import { DomainError } from '../../../shared/domain/errors.js';
import { normalizeEmail, validateEmailAndPassword } from '../domain/user.js';
import type { PasswordHasher } from '../ports/PasswordHasher.js';
import type { TokenService } from '../ports/TokenService.js';
import type { UserRepository } from '../ports/UserRepository.js';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: { id: string; email: string };
  accessToken: string;
}

export interface RegisterDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
}

export async function register(
  deps: RegisterDeps,
  input: RegisterInput,
): Promise<AuthResponse> {
  const email = normalizeEmail(input.email);
  validateEmailAndPassword(email, input.password);

  const existing = await deps.userRepository.findByEmail(email);
  if (existing) {
    throw new DomainError('email-taken', 'Email already registered.', 409);
  }

  const passwordHash = await deps.passwordHasher.hash(input.password);
  const user = await deps.userRepository.create({ email, passwordHash });
  const accessToken = deps.tokenService.sign(user.id);

  return { user: { id: user.id, email: user.email }, accessToken };
}
