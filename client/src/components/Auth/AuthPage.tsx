import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { LoginRequest } from '../../../types';
import '../../styles/auth.css';

export default function AuthPage() {
  const { login, register, error: authError, isLoading } = useAuth();
  const [credentials, setCredentials] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const isRegisterMode = mode === 'register';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!credentials.email || !credentials.password) {
      setLocalError('Enter both email and password');
      return;
    }

    try {
      if (isRegisterMode) {
        await register(credentials);
      } else {
        await login(credentials);
      }
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : isRegisterMode
            ? 'Registration attempt failed'
            : 'Login attempt failed',
      );
    }
  };

  return (
    <div className="auth-shell">
      <div className="login-section center">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-heading">
            <p className="eyebrow">Vi-Notes</p>
            <h1>{isRegisterMode ? 'Register as a writer' : 'Sign in'}</h1>
          </div>

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            value={credentials.email}
            onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            required
            value={credentials.password}
            onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? (isRegisterMode ? 'Creating account…' : 'Signing in…') : (isRegisterMode ? 'Create account' : 'Sign in')}
          </button>

          {(localError || authError) && (
            <p className="auth-error">{localError ?? authError ?? 'Unable to sign in'}</p>
          )}

          <p className="register-link">
            {isRegisterMode ? (
              <>
                Already a writer? <button type="button" onClick={() => setMode('login')}>Sign in</button>
              </>
            ) : (
              <>
                Don’t have a writer account? <button type="button" onClick={() => setMode('register')}>Register</button>
              </>
            )}
          </p>
          {isRegisterMode && (
            <p className="register-hint">
              Writers receive non-admin privileges. Admin accounts must be provisioned separately.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
