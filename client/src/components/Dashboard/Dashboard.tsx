import type { WritingSession } from "../../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardProps {
  sessions: WritingSession[];
  selectedSessionId: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

function getWordCount(text: string): number {
  const safeText = typeof text === "string" ? text : "";
  return safeText.trim() ? safeText.trim().split(/\s+/).length : 0;
}

function getPreview(text: string): string {
  const normalized = (typeof text === "string" ? text : "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "No content captured yet.";
  }
  return normalized.length > 120
    ? `${normalized.slice(0, 120)}...`
    : normalized;
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
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Sessions
          </p>
          <h2 className="text-lg font-semibold">Saved writing sessions</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Loading sessions...
        </p>
      )}

      {!isLoading && safeSessions.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No saved sessions yet.
        </p>
      )}

      <ScrollArea className="max-h-[400px]">
        <div className="flex flex-col gap-2">
          {safeSessions.map((session, index) => (
            <Card
              key={session?._id || index}
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/50",
                selectedSessionId === session?._id &&
                  "ring-1 ring-ring bg-accent/30",
              )}
              onClick={() => {
                if (session?._id) {
                  onSelect(session._id);
                }
              }}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant={
                        session?.analysis?.verdict?.toLowerCase() === "human"
                          ? "success"
                          : session?.analysis?.verdict
                                ?.toLowerCase()
                                .includes("assisted")
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {session?.analysis?.verdict ?? "PENDING"}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {getPreview(session?.documentSnapshot ?? "")}
                  </p>
                  <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                    <span>
                      {getWordCount(session?.documentSnapshot ?? "")} words
                    </span>
                    <span>
                      {session?.sessionDurationMs > 0
                        ? Math.round(session.sessionDurationMs / 1000)
                        : 0}
                      s
                    </span>
                    <span>
                      {session?.createdAt
                        ? new Date(session.createdAt).toLocaleString()
                        : "Unknown time"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (session?._id) {
                      onDelete(session._id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
