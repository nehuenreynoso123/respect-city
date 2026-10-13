import { useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError } from '@/shared/http/ApiError';

export interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
}

type Mode = 'login' | 'register';

/** Backend minimum (mirrors backend/src/modules/auth/domain/user.ts). */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Single-screen auth gate: toggles between login and register, validates the
 * obvious client-side cases, and shows the promise rejection inline. The
 * callback resolves on success and rejects with an ApiError on failure.
 */
export function AuthScreen({ onLogin, onRegister }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setBusy(true);
    try {
      if (isRegister) await onRegister(trimmedEmail, password);
      else await onLogin(trimmedEmail, password);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError(null);
  };

  return (
    <div id="auth-screen">
      <form id="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">
          RESPECT<span>CITY</span>
        </div>
        <div className="auth-title">{isRegister ? 'CREATE ACCOUNT' : 'LOGIN'}</div>

        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <button className="btn btn-gold auth-submit" type="submit" disabled={busy}>
          {busy ? '…' : isRegister ? 'Create account' : 'Log in'}
        </button>

        <button className="auth-switch" type="button" disabled={busy} onClick={switchMode}>
          {isRegister ? 'Have an account? Log in' : 'No account? Register'}
        </button>
      </form>
    </div>
  );
}

/** The backend message is already user-facing, so prefer it verbatim. */
function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}
