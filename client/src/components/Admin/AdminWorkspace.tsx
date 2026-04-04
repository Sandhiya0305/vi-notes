import { useCallback, useEffect, useState } from "react";
import { buildApiUrl } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import type { WritingSession } from "@shared/index";
import AdminReportDetail from "./AdminReportDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Trash2 } from "lucide-react";

interface AdminWorkspaceProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  sessionCount: number;
}

function deriveUsersFromSessions(sessions: WritingSession[]): AdminUserRow[] {
  const byOwner = new Map<string, AdminUserRow>();

  for (const session of sessions) {
    const id = session.ownerId || `unknown-${session.ownerEmail || "user"}`;
    const existing = byOwner.get(id);

    if (!existing) {
      byOwner.set(id, {
        id,
        name: session.ownerName?.trim() || "Unknown User",
        email: session.ownerEmail || "unknown@example.local",
        role: "user",
        sessionCount: 1,
      });
      continue;
    }

    existing.sessionCount += 1;
    if (!existing.name || existing.name === "Unknown User") {
      existing.name = session.ownerName?.trim() || existing.name;
    }
  }

  return Array.from(byOwner.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export default function AdminWorkspace({
  activeView,
  onNavigate,
  onLogout,
}: AdminWorkspaceProps) {
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState<WritingSession[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<WritingSession | null>(
    null,
  );
  const [selectedUserIdForReports, setSelectedUserIdForReports] = useState<
    string | null
  >(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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
      const sessionsResponse = await fetch(buildApiUrl("sessions"), {
        headers,
      });

      if (!sessionsResponse.ok) {
        throw new Error("Unable to load sessions");
      }

      const sessionsPayload =
        (await sessionsResponse.json()) as WritingSession[];
      const safeSessions = Array.isArray(sessionsPayload)
        ? sessionsPayload
        : [];

      setSessions(safeSessions);

      // Prefer canonical users endpoint, but gracefully fallback to session-derived rows.
      try {
        const usersResponse = await fetch(buildApiUrl("users"), { headers });
        if (!usersResponse.ok) {
          setUsers(deriveUsersFromSessions(safeSessions));
          return;
        }

        const usersPayload = (await usersResponse.json()) as {
          users?: AdminUserRow[];
        };

        const apiUsers = Array.isArray(usersPayload?.users)
          ? usersPayload.users
          : [];
        setUsers(
          apiUsers.length > 0
            ? apiUsers
            : deriveUsersFromSessions(safeSessions),
        );
      } catch {
        setUsers(deriveUsersFromSessions(safeSessions));
      }
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

  const handleDeleteUser = useCallback(
    async (targetUser: AdminUserRow) => {
      if (
        !window.confirm(
          `Delete user \"${targetUser.name}\" and all their sessions? This cannot be undone.`,
        )
      ) {
        return;
      }

      if (!token) {
        setError("Authentication required to delete users.");
        return;
      }

      setDeletingUserId(targetUser.id);
      try {
        const response = await fetch(buildApiUrl(`users/${targetUser.id}`), {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          throw new Error(errorBody?.error ?? "Unable to delete user");
        }

        setUsers((current) => current.filter((u) => u.id !== targetUser.id));
        setSessions((current) =>
          current.filter((session) => session.ownerId !== targetUser.id),
        );

        if (selectedUserIdForReports === targetUser.id) {
          setSelectedUserIdForReports(null);
        }

        if (selectedSession?.ownerId === targetUser.id) {
          setSelectedSession(null);
        }
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete user",
        );
      } finally {
        setDeletingUserId(null);
      }
    },
    [selectedSession, selectedUserIdForReports, token],
  );

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
        const response = await fetch(buildApiUrl(`sessions/${sessionId}`), {
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

  const selectedUserForReports = users.find(
    (entry) => entry.id === selectedUserIdForReports,
  );
  const selectedUserSessions = selectedUserForReports
    ? sessions
        .filter((session) => session.ownerId === selectedUserForReports.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
    : [];

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
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
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
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No users found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <ScrollArea className="w-full">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-[180px_1fr_220px_120px_120px_160px] gap-2 border-b px-1 pb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <span>User ID</span>
                      <span>Full Name</span>
                      <span>Email</span>
                      <span>Sessions</span>
                      <span>View Reports</span>
                      <span>Delete</span>
                    </div>

                    <div className="flex flex-col">
                      {users
                        .filter((entry) => entry.role !== "admin")
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="grid grid-cols-[180px_1fr_220px_120px_120px_160px] items-center gap-2 border-b px-1 py-3 text-sm last:border-b-0"
                          >
                            <span className="truncate text-xs text-muted-foreground">
                              {entry.id}
                            </span>
                            <span className="truncate font-medium">
                              {entry.name}
                            </span>
                            <span className="truncate text-muted-foreground">
                              {entry.email}
                            </span>
                            <span className="text-muted-foreground">
                              {entry.sessionCount}
                            </span>
                            <span>
                              <Button
                                size="sm"
                                variant={
                                  selectedUserIdForReports === entry.id
                                    ? "secondary"
                                    : "outline"
                                }
                                onClick={() =>
                                  setSelectedUserIdForReports(entry.id)
                                }
                              >
                                View
                              </Button>
                            </span>
                            <span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void handleDeleteUser(entry)}
                                title="Delete user and sessions"
                              >
                                {deletingUserId === entry.id
                                  ? "Deleting..."
                                  : "Delete User"}
                              </Button>
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {selectedUserForReports && (
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      Session Reports: {selectedUserForReports.name}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {selectedUserSessions.length} session
                      {selectedUserSessions.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {selectedUserSessions.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">
                      No sessions for this user.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedUserSessions.map((session) => (
                        <button
                          key={session._id}
                          type="button"
                          onClick={() => handleRowClick(session)}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent/40"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                session.analysis?.verdict?.toLowerCase() ===
                                "human"
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
                            <span className="max-w-[500px] truncate text-sm">
                              {session.documentSnapshot?.trim()
                                ? session.documentSnapshot.slice(0, 90) +
                                  (session.documentSnapshot.length > 90
                                    ? "..."
                                    : "")
                                : "No text"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{calculateWPM(session)} WPM</span>
                            <span>
                              {formatDuration(session.sessionDurationMs)}
                            </span>
                            <span>
                              {session.createdAt
                                ? new Date(
                                    session.createdAt,
                                  ).toLocaleDateString()
                                : "—"}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>
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
                        {session.analysis?.metrics?.typingVariance?.toFixed(
                          2,
                        ) ?? "N/A"}
                      </span>
                      <span className="text-muted-foreground">
                        {session.analysis?.confidenceScore?.toFixed(2) ?? "N/A"}
                      </span>
                      <span className="text-muted-foreground">
                        {session.analysis?.naturalnessScore?.toFixed(2) ??
                          "N/A"}
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
