import { useCallback, useRef, useState } from 'react';
import type {
  AuthenticityReport,
  EndSessionRequest,
  StartSessionResponse,
  UpdateSessionRequest,
  WritingSession,
} from '../types';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

interface SessionManagerState {
  activeSessionId: string | null;
  sessions: WritingSession[];
  currentReport: AuthenticityReport | null;
  isLoading: boolean;
  error: string | null;
}

interface SyncPayload {
  documentSnapshot: string;
  keystrokes: UpdateSessionRequest['keystrokes'];
  pastes: UpdateSessionRequest['pastes'];
  edits: UpdateSessionRequest['edits'];
  sessionDurationMs: number;
}

function isWritingSession(value: unknown): value is WritingSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<WritingSession>;
  return typeof session._id === 'string';
}

function normalizeSessionsPayload(payload: unknown): WritingSession[] {
  if (Array.isArray(payload)) {
    return payload.filter(isWritingSession);
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { sessions?: unknown[] }).sessions)) {
    return (payload as { sessions: unknown[] }).sessions.filter(isWritingSession);
  }

  return [];
}

export default function useSessionManager() {
  const { token } = useAuth();

  const [state, setState] = useState<SessionManagerState>({
    activeSessionId: null,
    sessions: [],
    currentReport: null,
    isLoading: false,
    error: null,
  });

  const syncedLengthsRef = useRef({
    keystrokes: 0,
    pastes: 0,
    edits: 0,
  });

  const setLoading = (isLoading: boolean) => {
    setState((current) => ({ ...current, isLoading }));
  };

  const setError = (error: string | null) => {
    setState((current) => ({ ...current, error }));
  };

  const resetSyncedLengths = () => {
    syncedLengthsRef.current = { keystrokes: 0, pastes: 0, edits: 0 };
  };

  const startSession = useCallback(async (documentSnapshot = ''): Promise<WritingSession> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ documentSnapshot }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const data = (await response.json()) as Partial<StartSessionResponse>;
      const session = data?.session;

      if (!session || typeof session._id !== 'string') {
        throw new Error('Invalid start session response');
      }

      resetSyncedLengths();
      setState((current) => ({
        ...current,
        activeSessionId: session._id,
        currentReport: null,
        isLoading: false,
        error: null,
      }));

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      setState((current) => ({ ...current, isLoading: false, error: message }));
      throw error;
    }
  }, [token]);

  const buildDeltaPayload = (sessionId: string, payload: SyncPayload): UpdateSessionRequest => {
    const deltaPayload: UpdateSessionRequest = {
      sessionId,
      documentSnapshot: payload.documentSnapshot,
      keystrokes: payload.keystrokes.slice(syncedLengthsRef.current.keystrokes),
      pastes: payload.pastes.slice(syncedLengthsRef.current.pastes),
      edits: payload.edits.slice(syncedLengthsRef.current.edits),
      sessionDurationMs: payload.sessionDurationMs,
    };

    syncedLengthsRef.current = {
      keystrokes: payload.keystrokes.length,
      pastes: payload.pastes.length,
      edits: payload.edits.length,
    };

    return deltaPayload;
  };

  const syncSession = useCallback(async (payload: SyncPayload): Promise<void> => {
    if (!state.activeSessionId) {
      return;
    }

    const deltaPayload = buildDeltaPayload(state.activeSessionId, payload);
    const hasChanges =
      deltaPayload.keystrokes.length > 0 ||
      deltaPayload.pastes.length > 0 ||
      deltaPayload.edits.length > 0;

    if (!hasChanges) {
      return;
    }

    const response = await fetch(`${API_BASE}/sessions/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(deltaPayload),
    });

    if (!response.ok) {
      throw new Error('Failed to update session');
    }
  }, [state.activeSessionId, token]);

  const analyzeSession = useCallback(async (sessionId: string): Promise<AuthenticityReport> => {
    const response = await fetch(`${API_BASE}/analysis/${sessionId}`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!response.ok) {
      throw new Error('Failed to analyze session');
    }

    const data = (await response.json()) as { report?: AuthenticityReport | null };
    const report = data?.report;

    if (!report) {
      throw new Error('Invalid analysis response');
    }

    setState((current) => ({
      ...current,
      currentReport: report,
    }));
    return report;
  }, [token]);

  const refreshSessions = useCallback(async (): Promise<WritingSession[]> => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = (await response.json()) as unknown;
      const normalizedSessions = normalizeSessionsPayload(data);
      setState((current) => ({
        ...current,
        sessions: normalizedSessions,
        error: null,
      }));
      return normalizedSessions;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch sessions';
      setState((current) => ({
        ...current,
        sessions: [],
        error: message,
      }));
      return [];
    }
  }, [token]);

  const endSession = useCallback(async (payload: SyncPayload): Promise<WritingSession | null> => {
    if (!state.activeSessionId) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const deltaPayload = buildDeltaPayload(state.activeSessionId, payload);
      const requestBody: EndSessionRequest = {
        ...deltaPayload,
        sessionId: state.activeSessionId,
      };

      const response = await fetch(`${API_BASE}/sessions/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      const data = (await response.json()) as { session?: WritingSession | null };
      const session = data?.session;

      if (!session || typeof session._id !== 'string') {
        throw new Error('Invalid end session response');
      }

      const report = await analyzeSession(session._id);
      await refreshSessions();

      setState((current) => ({
        ...current,
        activeSessionId: null,
        currentReport: report,
        isLoading: false,
        error: null,
      }));
      resetSyncedLengths();

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to end session';
      setState((current) => ({ ...current, isLoading: false, error: message }));
      throw error;
    }
  }, [analyzeSession, refreshSessions, state.activeSessionId, token]);

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      setState((current) => ({
        ...current,
        sessions: current.sessions.filter((session) => session._id !== sessionId),
        currentReport: current.currentReport?.sessionId === sessionId ? null : current.currentReport,
      }));
    },
    [token],
  );

  return {
    ...state,
    startSession,
    syncSession,
    endSession,
    analyzeSession,
    refreshSessions,
    deleteSession,
  };
}
