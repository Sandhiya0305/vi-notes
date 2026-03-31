import { useEffect, useState } from "react";
import { API_BASE } from "../../config/api";
import type { WritingSession } from "../../../../types";
import "../../styles/admin.css";

interface AdminReportDetailProps {
  session: WritingSession;
  onBack: () => void;
  token: string | null;
}

export default function AdminReportDetail({
  session,
  onBack,
  token,
}: AdminReportDetailProps) {
  const [fullSession, setFullSession] = useState<WritingSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFullSession = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/sessions/${session._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setFullSession(data.session);
        }
      } catch (error) {
        console.error("Failed to fetch full session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullSession();
  }, [session._id, token]);

  const displaySession = fullSession || session;

  const calculateWPM = (sess: WritingSession): number => {
    if (!sess.documentSnapshot || sess.sessionDurationMs === 0) return 0;
    const words = sess.documentSnapshot
      .trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;
    const minutes = sess.sessionDurationMs / 60000;
    return Math.round(words / minutes);
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getVerdictColor = (verdict: string | undefined): string => {
    switch (verdict) {
      case "HUMAN":
        return "#059669";
      case "AI_ASSISTED":
        return "#d97706";
      case "AI_GENERATED":
        return "#dc2626";
      default:
        return "#6b7280";
    }
  };

  if (isLoading) {
    return (
      <div className="admin-shell">
        <div className="admin-report-detail-loading">
          Loading full report...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="hero admin-hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Detailed Report</p>
          <h1>Session Analysis Summary</h1>
          <p className="hero-copy">
            Complete analysis for session {displaySession._id.slice(-8)}
          </p>
        </div>
        <div className="hero-actions">
          <button className="workspace-save" type="button" onClick={onBack}>
            ← Back to Table
          </button>
        </div>
      </header>

      <section className="admin-report-detail">
        {/* User Information */}
        <article className="admin-report-section">
          <h2>User Information</h2>
          <div className="admin-report-info-grid">
            <div className="admin-report-info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{displaySession.ownerEmail}</span>
            </div>
            <div className="admin-report-info-item">
              <span className="info-label">Session ID</span>
              <span className="info-value">{displaySession._id}</span>
            </div>
            <div className="admin-report-info-item">
              <span className="info-label">Created</span>
              <span className="info-value">
                {displaySession.createdAt
                  ? new Date(displaySession.createdAt).toLocaleString()
                  : "Unknown"}
              </span>
            </div>
            <div className="admin-report-info-item">
              <span className="info-label">Status</span>
              <span className="info-value">{displaySession.status}</span>
            </div>
          </div>
        </article>

        {/* Text Content */}
        <article className="admin-report-section">
          <h2>Text Content</h2>
          <div className="admin-report-text-content">
            {displaySession.documentSnapshot?.trim() ? (
              <p>{displaySession.documentSnapshot}</p>
            ) : (
              <p className="no-text">No text content available</p>
            )}
          </div>
        </article>

        {/* Key Metrics */}
        <article className="admin-report-section">
          <h2>Key Metrics</h2>
          <div className="admin-report-metrics-grid">
            <div className="admin-report-metric-card">
              <span className="metric-label">Words Per Minute (WPM)</span>
              <span className="metric-value">
                {calculateWPM(displaySession)}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Duration</span>
              <span className="metric-value">
                {formatDuration(displaySession.sessionDurationMs)}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Word Count</span>
              <span className="metric-value">
                {displaySession.analysis?.metrics?.wordCount ??
                  (displaySession.documentSnapshot?.trim()
                    ? displaySession.documentSnapshot
                        .trim()
                        .split(/\s+/)
                        .filter((w: string) => w.length > 0).length
                    : 0)}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Typing Variance</span>
              <span className="metric-value">
                {displaySession.analysis?.metrics?.typingVariance?.toFixed(2) ??
                  "N/A"}
              </span>
            </div>
          </div>
        </article>

        {/* Analysis Scores */}
        <article className="admin-report-section">
          <h2>Analysis Scores</h2>
          <div className="admin-report-metrics-grid">
            <div className="admin-report-metric-card">
              <span className="metric-label">Confidence Score</span>
              <span className="metric-value">
                {displaySession.analysis?.confidenceScore?.toFixed(2) ?? "N/A"}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Naturalness Score</span>
              <span className="metric-value">
                {displaySession.analysis?.naturalnessScore?.toFixed(2) ?? "N/A"}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Overall Suspicion Score</span>
              <span className="metric-value">
                {displaySession.analysis?.overallSuspicionScore?.toFixed(2) ??
                  "N/A"}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Clarity (Sentence Variation)</span>
              <span className="metric-value">
                {displaySession.analysis?.metrics?.textStatistics?.sentenceLengthVariation?.toFixed(
                  2,
                ) ?? "N/A"}
              </span>
            </div>
          </div>
        </article>

        {/* Text Statistics */}
        {displaySession.analysis?.metrics?.textStatistics && (
          <article className="admin-report-section">
            <h2>Text Statistics</h2>
            <div className="admin-report-metrics-grid">
              <div className="admin-report-metric-card">
                <span className="metric-label">Average Word Length</span>
                <span className="metric-value">
                  {displaySession.analysis.metrics.textStatistics.averageWordLength?.toFixed(
                    2,
                  ) ?? "N/A"}
                </span>
              </div>
              <div className="admin-report-metric-card">
                <span className="metric-label">Sentence Count</span>
                <span className="metric-value">
                  {displaySession.analysis.metrics.textStatistics
                    .sentenceCount ?? "N/A"}
                </span>
              </div>
              <div className="admin-report-metric-card">
                <span className="metric-label">Lexical Diversity</span>
                <span className="metric-value">
                  {displaySession.analysis.metrics.textStatistics.lexicalDiversity?.toFixed(
                    2,
                  ) ?? "N/A"}
                </span>
              </div>
              <div className="admin-report-metric-card">
                <span className="metric-label">Lexical Richness</span>
                <span className="metric-value">
                  {displaySession.analysis.metrics.textStatistics.lexicalRichness?.toFixed(
                    2,
                  ) ?? "N/A"}
                </span>
              </div>
            </div>
          </article>
        )}

        {/* Behavioral Metrics */}
        {displaySession.analysis?.metrics?.behavioral && (
          <article className="admin-report-section">
            <h2>Behavioral Metrics</h2>
            <div className="admin-report-metrics-grid">
              <div className="admin-report-metric-card">
                <span className="metric-label">Average Interval (ms)</span>
                <span className="metric-value">
                  {displaySession.analysis.metrics.behavioral.averageIntervalMs?.toFixed(
                    2,
                  ) ?? "N/A"}
                </span>
              </div>
              <div className="admin-report-metric-card">
                <span className="metric-label">Paste Ratio</span>
                <span className="metric-value">
                  {displaySession.analysis.metrics.behavioral.pasteRatio
                    ? `${Math.round(displaySession.analysis.metrics.behavioral.pasteRatio * 100)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="admin-report-metric-card">
                <span className="metric-label">Edit Ratio</span>
                <span className="metric-value">
                  {displaySession.analysis.metrics.behavioral.editRatio
                    ? `${Math.round(displaySession.analysis.metrics.behavioral.editRatio * 100)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="admin-report-metric-card">
                <span className="metric-label">
                  Context Aware Pause Pattern
                </span>
                <span className="metric-value">
                  {displaySession.analysis.metrics.behavioral
                    .contextAwarePausePattern ?? "N/A"}
                </span>
              </div>
            </div>
          </article>
        )}

        {/* Verdict */}
        <article className="admin-report-section">
          <h2>Final Verdict</h2>
          <div className="admin-report-verdict">
            <div
              className="verdict-badge-large"
              style={{
                backgroundColor: getVerdictColor(
                  displaySession.analysis?.verdict,
                ),
              }}
            >
              {displaySession.analysis?.verdict ?? "PENDING"}
            </div>
            <div className="verdict-details">
              <p>
                <strong>Confidence:</strong>{" "}
                {displaySession.analysis?.confidenceScore?.toFixed(2) ?? "N/A"}
              </p>
              <p>
                <strong>Suspicion:</strong>{" "}
                {displaySession.analysis?.overallSuspicionScore?.toFixed(2) ??
                  "N/A"}
              </p>
              <p>
                <strong>Naturalness:</strong>{" "}
                {displaySession.analysis?.naturalnessScore?.toFixed(2) ?? "N/A"}
              </p>
            </div>
          </div>
        </article>

        {/* Reasons */}
        {displaySession.analysis?.reasons &&
          displaySession.analysis.reasons.length > 0 && (
            <article className="admin-report-section">
              <h2>Analysis Reasons</h2>
              <ul className="admin-report-reasons">
                {displaySession.analysis.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </article>
          )}

        {/* Suspicious Segments */}
        {displaySession.analysis?.suspiciousSegments &&
          displaySession.analysis.suspiciousSegments.length > 0 && (
            <article className="admin-report-section">
              <h2>Suspicious Segments</h2>
              <div className="admin-report-segments">
                {displaySession.analysis.suspiciousSegments.map(
                  (segment, index) => (
                    <div
                      key={index}
                      className={`segment-card segment-${segment.suspicionLevel}`}
                    >
                      <div className="segment-header">
                        <span className="segment-level">
                          {segment.suspicionLevel.toUpperCase()}
                        </span>
                        <span className="segment-reason">{segment.reason}</span>
                      </div>
                      <p className="segment-text">"{segment.text}"</p>
                      <p className="segment-positions">
                        Position: {segment.startIndex} - {segment.endIndex}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </article>
          )}

        {/* Session Statistics */}
        <article className="admin-report-section">
          <h2>Session Statistics</h2>
          <div className="admin-report-metrics-grid">
            <div className="admin-report-metric-card">
              <span className="metric-label">Total Keystrokes</span>
              <span className="metric-value">
                {displaySession.keystrokes?.length ?? 0}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Total Pastes</span>
              <span className="metric-value">
                {displaySession.pastes?.length ?? 0}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Total Edits</span>
              <span className="metric-value">
                {displaySession.edits?.length ?? 0}
              </span>
            </div>
            <div className="admin-report-metric-card">
              <span className="metric-label">Document Length</span>
              <span className="metric-value">
                {displaySession.documentSnapshot?.length ?? 0} chars
              </span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
