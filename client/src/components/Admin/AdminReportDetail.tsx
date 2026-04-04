import { useEffect, useState } from "react";
import { buildApiUrl } from "@/config/api";
import type { WritingSession } from "@shared/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";

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
        const response = await fetch(buildApiUrl(`sessions/${session._id}`), {
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading full report...
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-5xl p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Detailed Report
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              Session Analysis
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* User info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <InfoItem label="Email" value={displaySession.ownerEmail} />
                <InfoItem
                  label="Session ID"
                  value={displaySession._id.slice(-8)}
                />
                <InfoItem
                  label="Created"
                  value={
                    displaySession.createdAt
                      ? new Date(displaySession.createdAt).toLocaleString()
                      : "Unknown"
                  }
                />
                <InfoItem label="Status" value={displaySession.status} />
              </div>
            </CardContent>
          </Card>

          {/* Text content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Text Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted/50 p-4 text-sm leading-relaxed">
                {displaySession.documentSnapshot?.trim() ? (
                  <p className="whitespace-pre-wrap">
                    {displaySession.documentSnapshot}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No text content available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key metrics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="WPM"
                  value={calculateWPM(displaySession).toString()}
                />
                <MetricCard
                  label="Duration"
                  value={formatDuration(displaySession.sessionDurationMs)}
                />
                <MetricCard
                  label="Word Count"
                  value={
                    displaySession.analysis?.metrics?.wordCount?.toString() ??
                    (displaySession.documentSnapshot?.trim()
                      ? displaySession.documentSnapshot
                          .trim()
                          .split(/\s+/)
                          .filter((w: string) => w.length > 0)
                          .length.toString()
                      : "0")
                  }
                />
                <MetricCard
                  label="Typing Variance"
                  value={
                    displaySession.analysis?.metrics?.typingVariance?.toFixed(
                      2,
                    ) ?? "N/A"
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Analysis scores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Analysis Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="Confidence"
                  value={
                    displaySession.analysis?.confidenceScore?.toFixed(2) ??
                    "N/A"
                  }
                />
                <MetricCard
                  label="Naturalness"
                  value={
                    displaySession.analysis?.naturalnessScore?.toFixed(2) ??
                    "N/A"
                  }
                />
                <MetricCard
                  label="Suspicion"
                  value={
                    displaySession.analysis?.overallSuspicionScore?.toFixed(
                      2,
                    ) ?? "N/A"
                  }
                />
                <MetricCard
                  label="Clarity"
                  value={
                    displaySession.analysis?.metrics?.textStatistics?.sentenceLengthVariation?.toFixed(
                      2,
                    ) ?? "N/A"
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Text statistics */}
          {displaySession.analysis?.metrics?.textStatistics && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Text Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricCard
                    label="Avg Word Length"
                    value={
                      displaySession.analysis.metrics.textStatistics.averageWordLength?.toFixed(
                        2,
                      ) ?? "N/A"
                    }
                  />
                  <MetricCard
                    label="Sentences"
                    value={
                      displaySession.analysis.metrics.textStatistics.sentenceCount?.toString() ??
                      "N/A"
                    }
                  />
                  <MetricCard
                    label="Lexical Diversity"
                    value={
                      displaySession.analysis.metrics.textStatistics.lexicalDiversity?.toFixed(
                        2,
                      ) ?? "N/A"
                    }
                  />
                  <MetricCard
                    label="Lexical Richness"
                    value={
                      displaySession.analysis.metrics.textStatistics.lexicalRichness?.toFixed(
                        2,
                      ) ?? "N/A"
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Behavioral metrics */}
          {displaySession.analysis?.metrics?.behavioral && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Behavioral Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricCard
                    label="Avg Interval"
                    value={
                      displaySession.analysis.metrics.behavioral
                        .averageIntervalMs != null
                        ? displaySession.analysis.metrics.behavioral.averageIntervalMs.toFixed(
                            0,
                          ) + "ms"
                        : "N/A"
                    }
                  />
                  <MetricCard
                    label="Paste Ratio"
                    value={
                      displaySession.analysis.metrics.behavioral.pasteRatio
                        ? `${Math.round(displaySession.analysis.metrics.behavioral.pasteRatio * 100)}%`
                        : "N/A"
                    }
                  />
                  <MetricCard
                    label="Edit Ratio"
                    value={
                      displaySession.analysis.metrics.behavioral.editRatio
                        ? `${Math.round(displaySession.analysis.metrics.behavioral.editRatio * 100)}%`
                        : "N/A"
                    }
                  />
                  <MetricCard
                    label="Pause Pattern"
                    value={
                      displaySession.analysis.metrics.behavioral
                        .contextAwarePausePattern ?? "N/A"
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final verdict */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Final Verdict</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Badge
                  className="px-4 py-1.5 text-sm"
                  variant={
                    displaySession.analysis?.verdict?.toLowerCase() === "human"
                      ? "success"
                      : displaySession.analysis?.verdict
                            ?.toLowerCase()
                            .includes("assisted")
                        ? "warning"
                        : "destructive"
                  }
                >
                  {displaySession.analysis?.verdict ?? "PENDING"}
                </Badge>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>
                    Confidence:{" "}
                    <strong className="text-foreground">
                      {displaySession.analysis?.confidenceScore?.toFixed(2) ??
                        "N/A"}
                    </strong>
                  </span>
                  <span>
                    Suspicion:{" "}
                    <strong className="text-foreground">
                      {displaySession.analysis?.overallSuspicionScore?.toFixed(
                        2,
                      ) ?? "N/A"}
                    </strong>
                  </span>
                  <span>
                    Naturalness:{" "}
                    <strong className="text-foreground">
                      {displaySession.analysis?.naturalnessScore?.toFixed(2) ??
                        "N/A"}
                    </strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis reasons */}
          {displaySession.analysis?.reasons &&
            displaySession.analysis.reasons.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Analysis Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-1.5">
                    {displaySession.analysis.reasons.map((reason, index) => (
                      <li
                        key={index}
                        className="rounded-md bg-muted/50 px-3 py-2 text-sm"
                      >
                        {reason}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

          {/* Suspicious segments */}
          {displaySession.analysis?.suspiciousSegments &&
            displaySession.analysis.suspiciousSegments.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Suspicious Segments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {displaySession.analysis.suspiciousSegments.map(
                      (segment, index) => (
                        <div
                          key={index}
                          className="rounded-md border bg-muted/30 p-3"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Badge
                              variant={
                                segment.suspicionLevel === "low"
                                  ? "secondary"
                                  : segment.suspicionLevel === "medium"
                                    ? "warning"
                                    : "destructive"
                              }
                            >
                              {segment.suspicionLevel.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {segment.reason}
                            </span>
                          </div>
                          <p className="text-sm italic">
                            &ldquo;{segment.text}&rdquo;
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Position: {segment.startIndex} – {segment.endIndex}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Session statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Session Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="Keystrokes"
                  value={displaySession.keystrokes?.length?.toString() ?? "0"}
                />
                <MetricCard
                  label="Pastes"
                  value={displaySession.pastes?.length?.toString() ?? "0"}
                />
                <MetricCard
                  label="Edits"
                  value={displaySession.edits?.length?.toString() ?? "0"}
                />
                <MetricCard
                  label="Doc Length"
                  value={
                    (displaySession.documentSnapshot?.length ?? 0) + " chars"
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
