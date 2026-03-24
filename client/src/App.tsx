import { useEffect, useRef, useState } from 'react';
import Dashboard from './components/Dashboard/Dashboard';
import Editor from './components/Editor/Editor';
import LiveIndicator from './components/LiveIndicator/LiveIndicator';
import ReportViewer from './components/ReportViewer/ReportViewer';
import useKeystrokeTracker from './hooks/useKeystrokeTracker';
import useSessionManager from './hooks/useSessionManager';
import type { WritingSession } from './types';
import './styles/app.css';

export default function App() {
  const [content, setContent] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const tracker = useKeystrokeTracker();
  const {
    activeSessionId,
    currentReport,
    error,
    isLoading,
    sessions,
    startSession,
    syncSession,
    endSession,
    refreshSessions,
    deleteSession,
  } = useSessionManager();
  const syncTimeoutRef = useRef<number | null>(null);
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  useEffect(() => {
    void refreshSessions().catch((refreshError) => {
      console.error('Failed to refresh sessions on load', refreshError);
    });
  }, [refreshSessions]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      void syncSession({
        documentSnapshot: content,
        keystrokes: Array.isArray(tracker.keystrokes) ? tracker.keystrokes : [],
        pastes: Array.isArray(tracker.pastes) ? tracker.pastes : [],
        edits: Array.isArray(tracker.edits) ? tracker.edits : [],
        sessionDurationMs: tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0,
      }).catch((syncError) => {
        console.error(syncError);
      });
    }, 900);

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [activeSessionId, content, syncSession, tracker.edits, tracker.keystrokes, tracker.pastes, tracker.sessionDurationMs]);

  const handleFocus = async () => {
    try {
      tracker.handleFocus();

      if (!activeSessionId) {
        await startSession(content ?? '');
      }
    } catch (focusError) {
      console.error('Focus session start failed', focusError);
    }
  };

  const handleBlur = async () => {
    try {
      tracker.handleBlur();

      if (!activeSessionId) {
        return;
      }

      await endSession({
        documentSnapshot: content ?? '',
        keystrokes: Array.isArray(tracker.keystrokes) ? tracker.keystrokes : [],
        pastes: Array.isArray(tracker.pastes) ? tracker.pastes : [],
        edits: Array.isArray(tracker.edits) ? tracker.edits : [],
        sessionDurationMs: tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0,
      });
      tracker.reset();
    } catch (blurError) {
      console.error('Blur session end failed', blurError);
    }
  };

  const handleContentChange = (nextContent: string, inputType?: string | null) => {
    const safeContent = typeof nextContent === 'string' ? nextContent : '';
    setContent(safeContent);
    tracker.handleInput(safeContent, inputType);
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const selected = safeSessions.find((session) => session?._id === sessionId);
    if (selected) {
      setContent(selected.documentSnapshot ?? '');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } catch (deleteError) {
      console.error('Delete session failed', deleteError);
    }
  };

  const selectedSession: WritingSession | undefined = safeSessions.find((session) => session?._id === selectedSessionId);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Vi-Notes</p>
          <h1>Human-vs-AI writing verification workspace</h1>
          <p className="hero-copy">
            Draft in the editor, capture writing behavior live, and review rule-based authenticity analysis after each session.
          </p>
        </div>
      </header>

      <main className="app-grid">
        <section className="workspace-column">
          <Editor
            content={content ?? ''}
            isSessionActive={Boolean(activeSessionId)}
            onContentChange={handleContentChange}
            onFocus={() => {
              void handleFocus();
            }}
            onBlur={() => {
              void handleBlur();
            }}
            onKeyDown={tracker.handleKeyDown}
            onPaste={tracker.handlePaste}
          />

          <div className="report-slot">
            {currentReport ? <ReportViewer report={currentReport} /> : null}
            {!currentReport && selectedSession?.analysis ? <ReportViewer report={selectedSession.analysis} /> : null}
          </div>
        </section>

        <section className="sidebar-column">
          <LiveIndicator
            keystrokes={Array.isArray(tracker.keystrokes) ? tracker.keystrokes : []}
            pastes={Array.isArray(tracker.pastes) ? tracker.pastes : []}
            edits={Array.isArray(tracker.edits) ? tracker.edits : []}
            sessionDurationMs={tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0}
          />

          <Dashboard
            sessions={safeSessions}
            selectedSessionId={selectedSessionId}
            isLoading={Boolean(isLoading)}
            onRefresh={() => {
              void refreshSessions().catch((refreshError) => {
                console.error('Manual refresh failed', refreshError);
              });
            }}
            onSelect={handleSelectSession}
            onDelete={(sessionId) => {
              void handleDeleteSession(sessionId);
            }}
          />
        </section>
      </main>

      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  );
}
