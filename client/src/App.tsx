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
  const [currentPage, setCurrentPage] = useState<'workspace' | 'sessions'>('workspace');
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
    } catch (blurError) {
      console.error('Blur session pause failed', blurError);
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
      setCurrentPage('workspace');
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

  const handleSaveSession = async () => {
    if (!activeSessionId) {
      return;
    }

    try {
      await syncSession({
        documentSnapshot: content ?? '',
        keystrokes: Array.isArray(tracker.keystrokes) ? tracker.keystrokes : [],
        pastes: Array.isArray(tracker.pastes) ? tracker.pastes : [],
        edits: Array.isArray(tracker.edits) ? tracker.edits : [],
        sessionDurationMs: tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0,
      });

      await endSession({
        documentSnapshot: content ?? '',
        keystrokes: Array.isArray(tracker.keystrokes) ? tracker.keystrokes : [],
        pastes: Array.isArray(tracker.pastes) ? tracker.pastes : [],
        edits: Array.isArray(tracker.edits) ? tracker.edits : [],
        sessionDurationMs: tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0,
      });

      tracker.reset();
    } catch (saveError) {
      console.error('Save session failed', saveError);
    }
  };

  const selectedSession: WritingSession | undefined = safeSessions.find((session) => session?._id === selectedSessionId);
  const displayedReport = currentReport ?? selectedSession?.analysis ?? null;

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Vi-Notes</p>
          <h1>AI Detector</h1>
          <p className="hero-copy">
            Draft in the editor, capture writing behavior live, and review rule-based authenticity analysis after each session.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className={currentPage === 'workspace' ? 'hero-tab active' : 'hero-tab'}
            type="button"
            onClick={() => setCurrentPage('workspace')}
          >
            Workspace
          </button>
          <button
            className={currentPage === 'sessions' ? 'hero-tab active' : 'hero-tab'}
            type="button"
            onClick={() => setCurrentPage('sessions')}
          >
            Sessions
          </button>
        </div>
      </header>

      {currentPage === 'workspace' ? (
        <main className="workspace-grid">
          <section className="analysis-column">
            <section className="workspace-dashboard">
              <div>
                <p className="eyebrow">Dashboard</p>
                <h2>Session controls</h2>
                <p className="workspace-dashboard-copy">
                  Your session stays active until you press save. Clicking outside the editor only pauses tracking.
                </p>
              </div>

              <button
                className="workspace-save"
                type="button"
                onClick={() => {
                  void handleSaveSession();
                }}
                disabled={!activeSessionId || Boolean(isLoading)}
              >
                {isLoading ? 'Saving...' : activeSessionId ? 'Save Session' : 'Start Writing to Save'}
              </button>
            </section>

            <LiveIndicator
              keystrokes={Array.isArray(tracker.keystrokes) ? tracker.keystrokes : []}
              pastes={Array.isArray(tracker.pastes) ? tracker.pastes : []}
              edits={Array.isArray(tracker.edits) ? tracker.edits : []}
              sessionDurationMs={tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0}
            />

            {displayedReport ? (
              <ReportViewer report={displayedReport} />
            ) : (
              <section className="report-placeholder">
                <p className="eyebrow">Analysis Report</p>
                <h2>Report will appear here</h2>
                <p>
                  Focus the editor to begin a tracked session, then press Save Session from the dashboard card to generate a report.
                </p>
              </section>
            )}
          </section>

          <section className="editor-column">
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
          </section>
        </main>
      ) : (
        <main className="dashboard-page">
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
        </main>
      )}

      {error ? <div className="error-banner">{error}</div> : null}
    </div>
  );
}
