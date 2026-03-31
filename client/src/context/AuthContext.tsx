import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { API_BASE } from '../config/api';
import type { AuthUser, LoginRequest, RegisterRequest } from '../../types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  error: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
}

type AuthStoragePayload = {
  user: AuthUser | null;
  token: string | null;
};

const STORAGE_KEY = 'vi-notes-auth';

const initialStorage = (): AuthStoragePayload => {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { user: null, token: null };
    }

    const parsed = JSON.parse(raw) as AuthStoragePayload;
    return {
      user: parsed.user,
      token: parsed.token,
    };
  } catch {
    return { user: null, token: null };
  }
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = useMemo<AuthStoragePayload>(initialStorage, []);
  const [state, setState] = useState<AuthState>({
    user: stored.user,
    token: stored.token,
    error: null,
    isLoading: false,
  });

  const persist = useCallback((payload: AuthStoragePayload) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = JSON.stringify(payload);
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // swallows storage errors
    }
  }, []);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? 'Invalid credentials');
      }

      const data = (await response.json()) as {
        token: string;
        expiresAt: number;
        user: AuthUser;
      };

      const nextState = {
        user: data.user,
        token: data.token,
        error: null,
        isLoading: false,
      };

      setState(nextState);
      persist({ user: data.user, token: data.token });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setState((current) => ({ ...current, isLoading: false, error: message }));
      throw error;
    }
  }, [persist]);

  const register = useCallback(async (payload: RegisterRequest) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? 'Registration failed');
      }

      const data = (await response.json()) as {
        token: string;
        expiresAt: number;
        user: AuthUser;
      };

      const nextState = {
        user: data.user,
        token: data.token,
        error: null,
        isLoading: false,
      };

      setState(nextState);
      persist({ user: data.user, token: data.token });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setState((current) => ({ ...current, isLoading: false, error: message }));
      throw error;
    }
  }, [persist]);

  const logout = useCallback(() => {
    clear();
    setState({
      user: null,
      token: null,
      error: null,
      isLoading: false,
    });
  }, [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
    }),
    [login, logout, register, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
