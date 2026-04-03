import { useCallback, useEffect, useRef, useState } from "react";
import useKeystrokeTracker from "@/hooks/useKeystrokeTracker";
import useSessionManager from "@/hooks/useSessionManager";
import type { WritingSession } from "@shared/index";
import Editor from "@/components/Editor/Editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  FileText,
  Gauge,
  Timer,
  Trash2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserWorkspaceProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export default function UserWorkspace({
  activeView,
  onNavigate,
  onLogout,
}: UserWorkspaceProps) {
  const tracker = useKeystrokeTracker();
  const {
    activeSessionId,
    currentReport,
    error,
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
  const [latestReport, setLatestReport] = useState<WritingSession["analysis"] | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

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
        // Clear previous report when a new session starts
        setLatestReport(null);
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

      // End the session and get the returned session + report
      const result = await endSession({
        documentSnapshot: content ?? "",
        keystrokes: Array.isArray(tracker.keystrokes) ? tracker.keystrokes : [],
        pastes: Array.isArray(tracker.pastes) ? tracker.pastes : [],
        edits: Array.isArray(tracker.edits) ? tracker.edits : [],
        sessionDurationMs:
          tracker.sessionDurationMs > 0 ? tracker.sessionDurationMs : 0,
      });

      tracker.reset();
      void refreshSessions();

      // Capture the analysis report
      if (result?.report) {
        setLatestReport(result.report);
      }
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
    tracker.handleKeyDown(event);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    tracker.handlePaste(event);
  };

  const handleSessionClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    onNavigate("sessionDetail");
  };

  // Live stats
  const safeContent = content.trim();
  const wordCount = safeContent.split(/\s+/).filter((chunk) => chunk.length > 0)
    .length;
  const elapsedMs = Math.max(tracker.sessionDurationMs, 0);
  const elapsedMinutes = elapsedMs / 60000;
  const liveWpm =
    elapsedMinutes > 0 ? Math.round(wordCount / elapsedMinutes) : 0;
  const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
  const durationLabel = `${Math.floor(elapsedMinutes)}m ${elapsedSeconds}s`;

  // Selected session for detail view
  const selectedSession = safeSessions.find(
    (s) => s._id === selectedSessionId,
  );
  const displayedReport = selectedSession?.analysis ?? currentReport ?? null;

  // ─── Session Detail View ─────────────────────────────────────────────────
  if (activeView === "sessionDetail" && selectedSession) {
    return (
      <SessionDetailView
        session={selectedSession}
        report={displayedReport}
        onBack={() => onNavigate("sessions")}
        onDelete={() => {
          void handleDeleteSession(selectedSession._id);
          onNavigate("sessions");
        }}
      />
    );
  }

  // ─── Sessions View ───────────────────────────────────────────────────────
  if (activeView === "sessions") {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              Writing Sessions
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshSessions()}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {safeSessions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No sessions yet. Start writing to create one.
              </CardContent>
            </Card>
          )}

          {safeSessions.map((session) => (
            <Card
              key={session._id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => handleSessionClick(session._id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
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
                      {session.analysis?.verdict ?? "PENDING"}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {getPreview(session.documentSnapshot ?? "")}
                  </p>
                  <div className="mt-1.5 flex gap-4 text-xs text-muted-foreground">
                    <span>
                      {getWordCount(session.documentSnapshot ?? "")} words
                    </span>
                    <span>
                      {session.sessionDurationMs > 0
                        ? Math.round(session.sessionDurationMs / 1000)
                        : 0}
                      s
                    </span>
                    <span>
                      {session.createdAt
                        ? new Date(session.createdAt).toLocaleString()
                        : "Unknown"}
                    </span>
                    {session.analysis?.metrics.wordCount != null && (
                      <span>
                        {Math.round(
                          session.analysis.metrics.wordCount /
                            Math.max(session.sessionDurationMs / 60000, 1),
                        )}{" "}
                        WPM
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteSession(session._id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Write View (default) ────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Vi-Notes
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Write</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Editor */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-6">
              <Editor
                content={content}
                placeholder="Start writing..."
                isSessionActive={!!activeSessionId}
                onContentChange={handleContentChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => void handleSaveSession()}
                  disabled={!activeSessionId}
                >
                  Analyze Writing
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis report (shown after Analyze Writing) */}
          {latestReport && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Analysis Report
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Badge
                    className="px-3 py-1 text-sm"
                    variant={
                      latestReport.verdict?.toLowerCase() === "human"
                        ? "success"
                        : latestReport.verdict
                              ?.toLowerCase()
                              .includes("assisted")
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {latestReport.verdict?.replace(/_/g, " ") ?? "PENDING"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(latestReport.generatedAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <MetricItem
                    label="Clarity"
                    value={`${Math.max(0, Math.round(100 - Math.min(100, latestReport.overallSuspicionScore ?? 0)))}%`}
                  />
                  <MetricItem
                    label="Confidence"
                    value={Math.round(latestReport.confidenceScore).toString()}
                  />
                  <MetricItem
                    label="Naturalness"
                    value={Math.round(latestReport.naturalnessScore).toString()}
                  />
                  <MetricItem
                    label="Suspicion"
                    value={Math.round(latestReport.overallSuspicionScore).toString()}
                  />
                </div>

                {latestReport.reasons?.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {latestReport.reasons.map((reason) => (
                      <li
                        key={reason}
                        className="rounded-md bg-muted/50 px-3 py-2 text-sm"
                      >
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {latestReport.correlation && (
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <h3 className="mb-3 text-sm font-semibold">
                      Correlation Summary
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {latestReport.correlation.summary}
                    </p>

                    {latestReport.correlation.correlationFindings?.length ? (
                      <div className="mt-3 flex flex-col gap-1.5">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Correlation Findings
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {latestReport.correlation.correlationFindings.map(
                            (finding) => (
                              <li
                                key={finding}
                                className="rounded-md bg-muted/50 px-3 py-2 text-sm"
                              >
                                {finding}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live stats sidebar */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Live Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <StatItem
                icon={<FileText className="h-3.5 w-3.5" />}
                label="Words"
                value={wordCount.toString()}
              />
              <StatItem
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Duration"
                value={durationLabel}
              />
              <StatItem
                icon={<Gauge className="h-3.5 w-3.5" />}
                label="WPM"
                value={liveWpm.toString()}
              />
              <StatItem
                icon={<Timer className="h-3.5 w-3.5" />}
                label="Status"
                value={activeSessionId ? "Live" : "Idle"}
                valueClass={
                  activeSessionId
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ""
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Session Detail View ─────────────────────────────────────────────────

interface SessionDetailViewProps {
  session: WritingSession;
  report: WritingSession["analysis"] | null;
  onBack: () => void;
  onDelete: () => void;
}

function SessionDetailView({
  session,
  report,
  onBack,
  onDelete,
}: SessionDetailViewProps) {
  const clarityValue = report
    ? `${Math.max(
        0,
        Math.round(100 - Math.min(100, report.overallSuspicionScore ?? 0)),
      )}%`
    : "—";
  const naturalnessValue =
    report?.naturalnessScore != null
      ? Math.round(report.naturalnessScore).toString()
      : "—";
  const confidenceValue =
    report?.confidenceScore != null
      ? Math.round(report.confidenceScore).toString()
      : "—";
  const scoreValue =
    report?.overallSuspicionScore != null
      ? Math.round(report.overallSuspicionScore).toString()
      : "—";

  const wpm =
    session.sessionDurationMs > 0 && session.documentSnapshot
      ? Math.round(
          session.documentSnapshot.trim().split(/\s+/).filter(Boolean).length /
            (session.sessionDurationMs / 60000),
        )
      : 0;

  const durationSec = Math.round(session.sessionDurationMs / 1000);
  const durationLabel =
    durationSec >= 60
      ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
      : `${durationSec}s`;

  const wordCount = session.documentSnapshot
    ? session.documentSnapshot.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-4xl p-6">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sessions
          </Button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Verdict banner */}
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <Badge
                  className="px-3 py-1 text-sm"
                  variant={
                    report?.verdict?.toLowerCase() === "human"
                      ? "success"
                      : report?.verdict?.toLowerCase().includes("assisted")
                        ? "warning"
                        : report?.verdict?.toLowerCase().includes("generated")
                          ? "destructive"
                          : "secondary"
                  }
                >
                  {report?.verdict?.replace(/_/g, " ") ?? "PENDING"}
                </Badge>
                <div className="text-sm">
                  <span className="font-medium">{wpm} WPM</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{wordCount} words</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{durationLabel}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                  {session.createdAt
                    ? new Date(session.createdAt).toLocaleString()
                    : ""}
                </span>
            </CardContent>
          </Card>

          {/* Scores */}
          {report && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Analysis Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-3">
                <MetricItem label="Clarity" value={clarityValue} />
                <MetricItem label="Confidence" value={confidenceValue} />
                <MetricItem label="Naturalness" value={naturalnessValue} />
                <MetricItem label="Suspicion" value={scoreValue} />
              </CardContent>
            </Card>
          )}

          {/* Reasons */}
          {report?.reasons?.length ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Analysis Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5">
                  {report.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="rounded-md bg-muted/50 px-3 py-2 text-sm"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {report?.correlation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Correlation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-muted-foreground">
                    {report.correlation.summary}
                  </p>
                </div>

                {report.correlation.correlationFindings?.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {report.correlation.correlationFindings.map((finding) => (
                      <li
                        key={finding}
                        className="rounded-md bg-muted/50 px-3 py-2 text-sm"
                      >
                        {finding}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Document text */}
          {session.documentSnapshot?.trim() && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {session.documentSnapshot}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No report yet */}
          {!report && (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                This session has not been analyzed yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────

function getWordCount(text: string): number {
  const safeText = typeof text === "string" ? text : "";
  return safeText.trim() ? safeText.trim().split(/\s+/).length : 0;
}

function getPreview(text: string): string {
  const normalized = (typeof text === "string" ? text : "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "No content captured yet.";
  return normalized.length > 120
    ? `${normalized.slice(0, 120)}...`
    : normalized;
}

function StatItem({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className={cn("text-xl font-bold", valueClass)}>{value}</p>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}
