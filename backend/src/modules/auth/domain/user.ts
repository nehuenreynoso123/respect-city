import { DomainError } from '../../../shared/domain/errors.js';

export const MIN_PASSWORD_LENGTH = 8;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmailAndPassword(email: string, password: string): void {
  if (!isValidEmail(email)) {
    throw new DomainError('validation', 'Invalid email.', 400);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new DomainError(
      'validation',
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      400,
    );
  }
}
