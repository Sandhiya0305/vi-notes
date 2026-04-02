import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import type { ArchivedReport, WritingSession } from "@shared/index";
import AdminReportDetail from "./AdminReportDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RefreshCw, Trash2, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminWorkspaceProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export default function AdminWorkspace({
  activeView,
  onNavigate,
  onLogout,
}: AdminWorkspaceProps) {
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState<WritingSession[]>([]);
  const [reports, setReports] = useState<ArchivedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<WritingSession | null>(
    null,
  );
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );

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

  // Group sessions by ownerEmail
  const sessionsByUser = sessions.reduce(
    (acc, session) => {
      const email = session.ownerEmail ?? "Unknown";
      if (!acc[email]) {
        acc[email] = [];
      }
      acc[email].push(session);
      return acc;
    },
    {} as Record<string, WritingSession[]>,
  );

  const userEmails = Object.keys(sessionsByUser).sort();

  // ─── Detail view ─────────────────────────────────────────────────────────
  if (selectedSession) {
    return (
      <AdminReportDetail
        session={selectedSession}
        onBack={handleCloseDetail}
        token={token}
      />
    );
  }

  // ─── User Reports view ──────────────────────────────────────────────────
  if (activeView === "reports") {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Admin Control
            </p>
            <h1 className="text-2xl font-bold tracking-tight">User Reports</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Loading reports...
            </CardContent>
          </Card>
        ) : userEmails.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No sessions recorded yet.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {userEmails.map((email) => {
              const userSessions = sessionsByUser[email];
              return (
                <UserReportGroup
                  key={email}
                  email={email}
                  sessions={userSessions}
                  onSessionClick={handleRowClick}
                  calculateWPM={calculateWPM}
                  formatDuration={formatDuration}
                />
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ─── All Sessions view (default) ────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Admin Control
          </p>
          <h1 className="text-2xl font-bold tracking-tight">All Sessions</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {user?.email ?? "Admin"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sessions table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sessions recorded yet.
            </p>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[1100px]">
                {/* Table header */}
                <div className="grid grid-cols-[140px_1fr_60px_80px_80px_80px_80px_80px_100px_140px_80px] gap-2 border-b px-1 pb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>User</span>
                  <span>Content</span>
                  <span>WPM</span>
                  <span>Duration</span>
                  <span>Variance</span>
                  <span>Confidence</span>
                  <span>Natural</span>
                  <span>Score</span>
                  <span>Verdict</span>
                  <span>Created</span>
                  <span>Actions</span>
                </div>

                {/* Table body */}
                <div className="flex flex-col">
                  {sessions.map((session) => (
                    <button
                      key={session._id}
                      type="button"
                      onClick={() => handleRowClick(session)}
                      className="grid grid-cols-[140px_1fr_60px_80px_80px_80px_80px_80px_100px_140px_80px] gap-2 border-b px-1 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/50"
                    >
                      <span className="truncate text-muted-foreground">
                        {session.ownerEmail}
                      </span>
                      <span className="truncate">
                        {session.documentSnapshot?.trim()
                          ? session.documentSnapshot.slice(0, 80) +
                            (session.documentSnapshot.length > 80 ? "..." : "")
                          : "No text yet"}
                      </span>
                      <span className="font-medium">
                        {calculateWPM(session)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDuration(session.sessionDurationMs)}
                      </span>
                      <span className="text-muted-foreground">
                        {session.analysis?.metrics?.typingVariance?.toFixed(2) ??
                          "N/A"}
                      </span>
                      <span className="text-muted-foreground">
                        {session.analysis?.confidenceScore?.toFixed(2) ?? "N/A"}
                      </span>
                      <span className="text-muted-foreground">
                        {session.analysis?.naturalnessScore?.toFixed(2) ?? "N/A"}
                      </span>
                      <span className="font-medium">
                        {session.analysis?.overallSuspicionScore?.toFixed(2) ??
                          "N/A"}
                      </span>
                      <span>
                        <Badge
                          variant={
                            session.analysis?.verdict?.toLowerCase() === "human"
                              ? "success"
                              : session.analysis?.verdict
                                    ?.toLowerCase()
                                    .includes("assisted")
                                ? "warning"
                                : session.analysis?.verdict
                                    ?.toLowerCase()
                                    .includes("generated")
                                  ? "destructive"
                                  : "secondary"
                          }
                        >
                          {session.analysis?.verdict ?? "pending"}
                        </Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session.createdAt
                          ? new Date(session.createdAt).toLocaleString()
                          : "Unknown"}
                      </span>
                      <span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteSession(session._id);
                          }}
                          disabled={deletingSessionId === session._id}
                        >
                          {deletingSessionId === session._id ? (
                            "..."
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── User Report Group (collapsible accordion) ──────────────────────────

interface UserReportGroupProps {
  email: string;
  sessions: WritingSession[];
  onSessionClick: (session: WritingSession) => void;
  calculateWPM: (session: WritingSession) => number;
  formatDuration: (ms: number) => string;
}

function UserReportGroup({
  email,
  sessions,
  onSessionClick,
  calculateWPM,
  formatDuration,
}: UserReportGroupProps) {
  const [open, setOpen] = useState(false);

  const analyzedCount = sessions.filter((s) => s.analysis).length;
  const humanCount = sessions.filter(
    (s) => s.analysis?.verdict?.toLowerCase() === "human",
  ).length;
  const flaggedCount = sessions.filter(
    (s) =>
      s.analysis?.verdict?.toLowerCase().includes("assisted") ||
      s.analysis?.verdict?.toLowerCase().includes("generated"),
  ).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{email}</p>
                <p className="text-xs text-muted-foreground">
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                  {analyzedCount > 0 && (
                    <>
                      {" "}
                      &middot; {humanCount} human
                      {flaggedCount > 0 && <> &middot; {flaggedCount} flagged</>}
                    </>
                  )}
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 pb-3 pt-1">
            <div className="flex flex-col gap-1.5 pt-2">
              {sessions.map((session) => (
                <button
                  key={session._id}
                  type="button"
                  onClick={() => onSessionClick(session)}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        session.analysis?.verdict?.toLowerCase() === "human"
                          ? "success"
                          : session.analysis?.verdict
                                ?.toLowerCase()
                                .includes("assisted")
                            ? "warning"
                            : session.analysis?.verdict
                                ?.toLowerCase()
                                .includes("generated")
                              ? "destructive"
                              : "secondary"
                      }
                    >
                      {session.analysis?.verdict ?? "pending"}
                    </Badge>
                    <span className="text-sm">
                      {session.documentSnapshot?.trim()
                        ? session.documentSnapshot.slice(0, 60) +
                          (session.documentSnapshot.length > 60 ? "..." : "")
                        : "No text"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{calculateWPM(session)} WPM</span>
                    <span>{formatDuration(session.sessionDurationMs)}</span>
                    <span>
                      {session.createdAt
                        ? new Date(session.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
