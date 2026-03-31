import { useCallback, useEffect, useRef, useState } from "react";
import useKeystrokeTracker from "../../hooks/useKeystrokeTracker";
import useSessionManager from "../../hooks/useSessionManager";
import type { WritingSession } from "../../types";
import { useAuth } from "../../context/AuthContext";
import Editor from "../Editor/Editor";
import "../../styles/user.css";

interface UserWorkspaceProps {
  onLogout: () => void;
}

export default function UserWorkspace({ onLogout }: UserWorkspaceProps) {
  const { user } = useAuth();
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
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [content, setContent] = useState("");
  const syncTimeoutRef = useRef<number | null>(null);
  const [isHistoryCollapsed, setHistoryCollapsed] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  useEffect(() => {
    void refreshSessions().catch((refreshError) => {
      console.error("Failed to refresh sessions on load", refreshError);
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
        sessionDurationMs:
          tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0,
      }).catch((syncError) => {
        console.error(syncError);
      });
    }, 900);

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [
    activeSessionId,
    content,
    syncSession,
    tracker.edits,
    tracker.keystrokes,
    tracker.pastes,
    tracker.sessionDurationMs,
  ]);

  const handleFocus = async () => {
    try {
      tracker.handleFocus();
    } catch (focusError) {
      console.error("Focus session start failed", focusError);
    }
  };

  const handleBlur = async () => {
    try {
      tracker.handleBlur();
    } catch (blurError) {
      console.error("Blur session pause failed", blurError);
    }
  };

  const startingSession = useRef(false);

  const ensureSessionStarted = useCallback(
    async (nextContent: string) => {
      const trimmed = nextContent.trim();
      if (!trimmed || activeSessionId || startingSession.current) {
        return;
      }

      startingSession.current = true;
      try {
        await startSession(nextContent);
      } catch (startError) {
        console.error("Session start failed", startError);
      } finally {
        startingSession.current = false;
      }
    },
    [activeSessionId, startSession],
  );

  const handleContentChange = (
    nextContent: string,
    inputType?: string | null,
  ) => {
    const safeContent = typeof nextContent === "string" ? nextContent : "";
    setContent(safeContent);
    tracker.handleInput(safeContent, inputType);
    void ensureSessionStarted(safeContent);
  };

  const handleSaveSession = async () => {
    if (!activeSessionId) {
      return;
    }

    try {
      await syncSession({
        documentSnapshot: content ?? "",
        keystrokes: Array.isArray(tracker.keystrokes) ? tracker.keystrokes : [],
        pastes: Array.isArray(tracker.pastes) ? tracker.pastes : [],
        edits: Array.isArray(tracker.edits) ? tracker.edits : [],
        sessionDurationMs:
          tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0,
      });

      await endSession({
        documentSnapshot: content ?? "",
        keystrokes: Array.isArray(tracker.keystrokes) ? tracker.keystrokes : [],
        pastes: Array.isArray(tracker.pastes) ? tracker.pastes : [],
        edits: Array.isArray(tracker.edits) ? tracker.edits : [],
        sessionDurationMs:
          tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0,
      });

      tracker.reset();
    } catch (saveError) {
      console.error("Save session failed", saveError);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } catch (deleteError) {
      console.error("Delete session failed", deleteError);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Track keydown events for analytics
    tracker.handleKeyDown(event);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    // Track paste events for analytics
    tracker.handlePaste(event);
  };

  const selectedSession: WritingSession | undefined = safeSessions.find(
    (session) => session._id === selectedSessionId,
  );
  const displayedSession = selectedSession;
  const displayedReport =
    analysisOpen && selectedSession
      ? selectedSession.analysis ?? currentReport ?? null
      : null;
  const metrics = displayedReport?.metrics;

  const formatNumber = (value?: number, suffix = "") =>
    typeof value === "number" ? `${value.toFixed(2)}${suffix}` : "—";

  const safeContent = content.trim();
  const wordCount = safeContent.split(/\s+/).filter((chunk) => chunk.length > 0)
    .length;
  const elapsedMs = Math.max(tracker.sessionDurationMs, 0);
  const elapsedMinutes = elapsedMs / 60000;
  const liveWpm = elapsedMinutes > 0 ? Math.round(wordCount / elapsedMinutes) : 0;
  const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
  const durationLabel = `${Math.floor(elapsedMinutes)}m ${elapsedSeconds}s`;
  const sessionSummary = displayedReport;
  const showSessionSummary = Boolean(analysisOpen && displayedReport);
  const clarityValue = sessionSummary
    ? `${Math.max(
        0,
        Math.round(
          100 - Math.min(100, sessionSummary.overallSuspicionScore ?? 0),
        ),
      )}%`
    : '—';
  const naturalnessValue =
    sessionSummary?.naturalnessScore != null
      ? Math.round(sessionSummary.naturalnessScore).toString()
      : '—';
  const confidenceValue =
    sessionSummary?.confidenceScore != null
      ? Math.round(sessionSummary.confidenceScore).toString()
      : '—';
  const scoreValue =
    sessionSummary?.overallSuspicionScore != null
      ? Math.round(sessionSummary.overallSuspicionScore).toString()
      : '—';

  return (
    <div className="writer-dashboard">
      <header className="dashboard-header">
        <div>
          <p className="label">Vi-Notes</p>
          <h1 className="title">Writing analytics</h1>
          <p className="subtitle">
            Focused editor with a single insights column.
          </p>
        </div>
        <div className="header-actions">
          <span className="status-pill">{user?.email ?? "writer"}</span>
          <button className="ghost-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="editor-panel">
          <Editor
            content={content}
            placeholder="Start writing your thoughts..."
            isSessionActive={!!activeSessionId}
            onContentChange={handleContentChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
          <div className="editor-panel__actions">
            <button
              className="primary-btn"
              onClick={() => void handleSaveSession()}
              disabled={!activeSessionId}
            >
              Analyze Writing
            </button>
            <p className="helper-text">
              Writing is tracked live. Save the session whenever you want an
              updated report.
            </p>
          </div>
        </section>

        <aside className="insights-panel">
          <div className="insights-section">
            <p className="section-label">Live stats</p>
            <div className="stats-grid">
              <div>
                <p className="big-number">{wordCount}</p>
                <p className="metric-label">Words</p>
              </div>
              <div>
                <p className="big-number">{durationLabel}</p>
                <p className="metric-label">Duration</p>
              </div>
              <div>
                <p className="big-number">{liveWpm}</p>
                <p className="metric-label">WPM</p>
              </div>
              <div>
                <p className="big-number text-emerald-500">
                  {activeSessionId ? "Live" : "Idle"}
                </p>
                <p className="metric-label">Status</p>
              </div>
            </div>
          </div>

          <div className="insights-section">
            <p className="section-label">Session summary</p>
            {showSessionSummary ? (
              <div className="summary-grid">
                <div>
                  <p className="metric-title">Clarity</p>
                  <p className="metric-value">{clarityValue}</p>
                </div>
                <div>
                  <p className="metric-title">Naturalness</p>
                  <p className="metric-value">{naturalnessValue}</p>
                </div>
                <div>
                  <p className="metric-title">Confidence</p>
                  <p className="metric-value">{confidenceValue}</p>
                </div>
                <div>
                  <p className="metric-title">Score</p>
                  <p className="metric-value">{scoreValue}</p>
                </div>
              </div>
            ) : (
              <p className="summary-placeholder">
                Start typing to activate a session and generate a live analysis.
              </p>
            )}
          </div>

          <div className="insights-section">
            <div className="section-heading">
              <p className="section-label">Writing history</p>
              <button
                type="button"
                className="ghost-btn history-toggle-btn"
                onClick={() => setHistoryCollapsed((prev) => !prev)}
              >
                {isHistoryCollapsed ? 'Show history' : 'Hide history'}
              </button>
            </div>
            {!isHistoryCollapsed && (
              <div className="history-list">
                {safeSessions.slice(0, 5).map((session) => (
                  <div
                    key={session._id}
                    className={`history-row ${session._id === selectedSessionId ? "history-row--active" : ""}`}
                    onClick={() => {
                      setSelectedSessionId(session._id);
                      setAnalysisOpen(true);
                    }}
                  >
                    <div>
                      <p className="history-title">
                        {session.analysis?.verdict ?? "Pending"}
                      </p>
                      <p className="history-meta">
                        {session.createdAt
                          ? new Date(session.createdAt).toLocaleTimeString()
                          : "—"}
                      </p>
                    </div>
                    <span className="history-badge">
                      {Math.round(
                        (session.analysis?.metrics.wordCount ?? 0) /
                          Math.max(session.sessionDurationMs / 60000, 1),
                      )}{" "}
                      WPM
                    </span>
                  </div>
                ))}
                {safeSessions.length === 0 && (
                  <p className="history-empty">No sessions yet.</p>
                )}
              </div>
            )}
          </div>

          <div className="insights-section">
            <div className="section-heading">
              <p className="section-label">Analysis report</p>
              <button
                type="button"
                className="ghost-btn analysis-toggle-btn"
                onClick={() => setAnalysisOpen((prev) => !prev)}
              >
                {analysisOpen ? 'Hide report' : 'View report'}
              </button>
            </div>
            {analysisOpen ? (
              displayedReport ? (
                <div className="analysis-report">
                  <div className="analysis-verdict-row">
                    <span
                      className={`analysis-verdict-chip verdict-${displayedReport.verdict?.toLowerCase()}`}
                    >
                      {displayedReport.verdict.replace(/_/g, ' ')}
                    </span>
                    <span className="analysis-duration">Generated {new Date(displayedReport.generatedAt).toLocaleString()}</span>
                  </div>
                  <div className="analysis-metrics">
                    <div>
                      <p className="analysis-metric-label">Confidence</p>
                      <p className="analysis-metric-value">
                        {Math.round(displayedReport.confidenceScore)}
                      </p>
                    </div>
                    <div>
                      <p className="analysis-metric-label">Naturalness</p>
                      <p className="analysis-metric-value">
                        {Math.round(displayedReport.naturalnessScore)}
                      </p>
                    </div>
                    <div>
                      <p className="analysis-metric-label">Score</p>
                      <p className="analysis-metric-value">
                        {Math.round(displayedReport.overallSuspicionScore)}
                      </p>
                    </div>
                  </div>
                  {displayedReport.reasons?.length ? (
                    <ul className="analysis-reasons">
                      {displayedReport.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="analysis-empty">
                      No additional reasons were recorded for this report.
                    </p>
                  )}
                </div>
              ) : (
                <p className="analysis-empty">
                  Select a completed session above to reveal its analysis report.
                </p>
              )
            ) : (
              <p className="analysis-empty">Click “View report” to inspect an analysis.</p>
            )}
          </div>
        </aside>
      </div>

      {error && <div className="error-tag">{error}</div>}
    </div>
  );
}
