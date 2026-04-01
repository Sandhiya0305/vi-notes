import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import type { ArchivedReport, WritingSession } from "../../../../types";
import AdminReportDetail from "./AdminReportDetail";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import "../../styles/admin.css";

interface AdminWorkspaceProps {
  onLogout: () => void;
}

export default function AdminWorkspace({ onLogout }: AdminWorkspaceProps) {
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState<WritingSession[]>([]);
  const [reports, setReports] = useState<ArchivedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<WritingSession | null>(
    null,
  );
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    setIsLoading(true);
    setError(null);

    try {
      const [sessionsResponse, reportsResponse] = await Promise.all([
        fetch(`${API_BASE}/sessions`, { headers }),
        fetch(`${API_BASE}/reports`, { headers }),
      ]);

      if (!sessionsResponse.ok) {
        throw new Error("Unable to load sessions");
      }

      if (!reportsResponse.ok) {
        throw new Error("Unable to load reports");
      }

      const sessionsPayload =
        (await sessionsResponse.json()) as WritingSession[];
      const reportsPayload = (await reportsResponse.json()) as {
        reports?: ArchivedReport[];
      };

      setSessions(Array.isArray(sessionsPayload) ? sessionsPayload : []);
      setReports(
        Array.isArray(reportsPayload?.reports) ? reportsPayload.reports : [],
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load admin data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!window.confirm("Delete this session for good?")) {
        return;
      }

      if (!token) {
        setError("Authentication required to delete sessions.");
        return;
      }

      setDeletingSessionId(sessionId);
      try {
        const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error("Unable to delete session");
        }

        setSessions((current) =>
          current.filter((session) => session._id !== sessionId),
        );

        if (selectedSession?._id === sessionId) {
          setSelectedSession(null);
        }
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete session",
        );
      } finally {
        setDeletingSessionId(null);
      }
    },
    [selectedSession, token],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const calculateWPM = (session: WritingSession): number => {
    if (!session.documentSnapshot || session.sessionDurationMs === 0) return 0;
    const words = session.documentSnapshot
      .trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;
    const minutes = session.sessionDurationMs / 60000;
    return Math.round(words / minutes);
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleRowClick = (session: WritingSession) => {
    setSelectedSession(session);
  };

  const handleCloseDetail = () => {
    setSelectedSession(null);
  };

  if (selectedSession) {
    return (
      <AdminReportDetail
        session={selectedSession}
        onBack={handleCloseDetail}
        token={token}
      />
    );
  }

  return (
    <div className="admin-shell">
      <header className="hero admin-hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Admin control</p>
          <h1>Sessions & comprehensive reports</h1>
          {/* <p className="hero-copy">
            All encrypted sessions and archived verdicts are stored for audits.
            Click on any row to view the full report.
          </p> */}
        </div>
        <div className="hero-actions">
          <span className="admin-user">{user?.email ?? "Signed in user"}</span>
          <ThemeToggle />
          <button className="workspace-save" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="admin-grid">
        <article className="admin-pane admin-pane-full">
          <div className="admin-pane-header">
            <div>
              {/* <p className="eyebrow">Ultimate Session Table</p> */}
              <h2>All Sessions</h2>
            </div>
            <button
              className="workspace-save"
              type="button"
              onClick={() => void fetchData()}
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="admin-empty">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="admin-empty">No sessions recorded yet.</p>
          ) : (
            <div className="table-scroll">
              <table className="admin-table admin-table-ultimate">
                <thead>
                <tr>
                  <th>User Email</th>
                  <th>Text Content</th>
                  <th>WPM</th>
                  <th>Duration</th>
                  <th>Typing Variance</th>
                  {/* <th>Clarity</th> */}
                  <th>Confidence</th>
                  <th>Naturalness</th>
                  <th>Score</th>
                  <th>Verdict</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
                </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session._id}
                    onClick={() => handleRowClick(session)}
                    className="admin-table-row-clickable"
                  >
                      <td className="user-email-cell">{session.ownerEmail}</td>
                      <td className="text-content-cell">
                        <p className="session-preview-full">
                          {session.documentSnapshot?.trim()
                            ? session.documentSnapshot.slice(0, 150) +
                              (session.documentSnapshot.length > 150
                                ? "..."
                                : "")
                            : "No text yet"}
                        </p>
                      </td>
                      <td className="metric-cell">{calculateWPM(session)}</td>
                      <td className="metric-cell">
                        {formatDuration(session.sessionDurationMs)}
                      </td>
                      <td className="metric-cell">
                        {session.analysis?.metrics?.typingVariance?.toFixed(
                          2,
                        ) ?? "N/A"}
                      </td>
                      <td className="metric-cell">
                        {session.analysis?.metrics?.textStatistics?.sentenceLengthVariation?.toFixed(
                          2,
                        ) ?? "N/A"}
                      </td>
                      <td className="metric-cell">
                        {session.analysis?.confidenceScore?.toFixed(2) ?? "N/A"}
                      </td>
                      <td className="metric-cell">
                        {session.analysis?.naturalnessScore?.toFixed(2) ??
                          "N/A"}
                      </td>
                      <td className="metric-cell score-cell">
                        {session.analysis?.overallSuspicionScore?.toFixed(2) ??
                          "N/A"}
                      </td>
                      <td
                        className={`verdict-cell verdict-${session.analysis?.verdict?.toLowerCase() ?? "pending"}`}
                      >
                        {session.analysis?.verdict ?? "pending"}
                      </td>
                      <td className="date-cell">
                        {session.createdAt
                          ? new Date(session.createdAt).toLocaleString()
                          : "Unknown"}
                      </td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="workspace-save danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteSession(session._id);
                          }}
                          disabled={deletingSessionId === session._id}
                        >
                          {deletingSessionId === session._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  );
}
