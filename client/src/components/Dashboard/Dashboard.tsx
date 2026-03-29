import type { WritingSession } from '../../types';
import '../../styles/dashboard.css';

interface DashboardProps {
  sessions: WritingSession[];
  selectedSessionId: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

function getWordCount(text: string): number {
  const safeText = typeof text === 'string' ? text : '';
  return safeText.trim() ? safeText.trim().split(/\s+/).length : 0;
}

function getPreview(text: string): string {
  const normalized = (typeof text === 'string' ? text : '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'No content captured yet.';
  }
  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
}

export default function Dashboard({
  sessions,
  selectedSessionId,
  isLoading,
  onRefresh,
  onSelect,
  onDelete,
}: DashboardProps) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  return (
    <section className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Sessions</p>
          <h2>Saved writing sessions</h2>
        </div>
        <button className="dashboard-refresh" onClick={onRefresh} type="button">
          Refresh
        </button>
      </div>

      {isLoading ? <p className="dashboard-empty">Loading sessions...</p> : null}
      {!isLoading && safeSessions.length === 0 ? <p className="dashboard-empty">No saved sessions yet.</p> : null}

      <div className="session-list">
        {Array.isArray(safeSessions) &&
          safeSessions.map((session, index) => (
          <article
            key={session?._id || index}
            className={selectedSessionId === session?._id ? 'session-card selected' : 'session-card'}
            onClick={() => {
              if (session?._id) {
                onSelect(session._id);
              }
            }}
          >
            <div className="session-card-top">
              <span className="session-chip">{session?.analysis?.verdict ?? 'PENDING'}</span>
              <button
                className="session-delete"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (session?._id) {
                    onDelete(session._id);
                  }
                }}
              >
                Delete
              </button>
            </div>

            <p className="session-preview">{getPreview(session?.documentSnapshot ?? '')}</p>

            <div className="session-meta">
              <span>{getWordCount(session?.documentSnapshot ?? '')} words</span>
              <span>{session?.sessionDurationMs > 0 ? Math.round(session.sessionDurationMs / 1000) : 0}s</span>
              <span>{session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown time'}</span>
            </div>
          </article>
          ))}
      </div>
    </section>
  );
}
