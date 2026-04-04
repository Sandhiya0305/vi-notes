import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildApiUrl } from "../config/api";
import type {
  AuthSessionResponse,
  AuthUser,
  LoginRequest,
  RegisterInitiationResponse,
  RegisterRequest,
  VerifyRegistrationRequest,
} from "@shared/index";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  error: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<RegisterInitiationResponse>;
  resendVerificationCode: (
    verificationToken: string,
  ) => Promise<RegisterInitiationResponse>;
  verifyRegistration: (payload: VerifyRegistrationRequest) => Promise<void>;
  logout: () => void;
}

type AuthStoragePayload = {
  user: AuthUser | null;
  token: string | null;
};

const STORAGE_KEY = "vi-notes-auth";

const initialStorage = (): AuthStoragePayload => {
  if (typeof window === "undefined") {
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
    if (typeof window === "undefined") {
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
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (payload: LoginRequest) => {
      setState((current) => ({ ...current, isLoading: true, error: null }));

      try {
        const response = await fetch(buildApiUrl("auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.error ?? "Invalid credentials");
        }

        const data = (await response.json()) as AuthSessionResponse;

        const nextState = {
          user: data.user,
          token: data.token,
          error: null,
          isLoading: false,
        };

        setState(nextState);
        persist({ user: data.user, token: data.token });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        setState((current) => ({
          ...current,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [persist],
  );

  const register = useCallback(async (payload: RegisterRequest) => {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const response = await fetch(buildApiUrl("auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Registration failed");
      }

      const data = (await response.json()) as RegisterInitiationResponse;

      setState((current) => ({ ...current, isLoading: false, error: null }));
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
      setState((current) => ({ ...current, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const resendVerificationCode = useCallback(
    async (verificationToken: string) => {
      setState((current) => ({ ...current, isLoading: true, error: null }));

      try {
        const response = await fetch(buildApiUrl("auth/register/resend"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationToken }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(
            errorBody?.error ?? "Unable to resend verification code",
          );
        }

        const data = (await response.json()) as RegisterInitiationResponse;
        setState((current) => ({ ...current, isLoading: false, error: null }));
        return data;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to resend verification code";
        setState((current) => ({
          ...current,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [],
  );

  const verifyRegistration = useCallback(
    async (payload: VerifyRegistrationRequest) => {
      setState((current) => ({ ...current, isLoading: true, error: null }));

      try {
        const response = await fetch(buildApiUrl("auth/register/verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.error ?? "Verification failed");
        }

        const data = (await response.json()) as AuthSessionResponse;

        const nextState = {
          user: data.user,
          token: data.token,
          error: null,
          isLoading: false,
        };

        setState(nextState);
        persist({ user: data.user, token: data.token });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Verification failed";
        setState((current) => ({
          ...current,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [persist],
  );

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
      resendVerificationCode,
      verifyRegistration,
      logout,
    }),
    [
      login,
      logout,
      register,
      resendVerificationCode,
      state,
      verifyRegistration,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
