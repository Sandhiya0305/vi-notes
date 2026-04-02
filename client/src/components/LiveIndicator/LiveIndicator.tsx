import { useMemo } from "react";
import type {
  EditEvent,
  KeystrokeEvent,
  LiveIndicatorState,
  PasteEvent,
} from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LiveIndicatorProps {
  keystrokes: KeystrokeEvent[];
  pastes: PasteEvent[];
  edits: EditEvent[];
  sessionDurationMs: number;
}

function round(value: number): number {
  return Math.round(value);
}

export default function LiveIndicator({
  keystrokes,
  pastes,
  edits,
  sessionDurationMs,
}: LiveIndicatorProps) {
  const state = useMemo<LiveIndicatorState>(() => {
    const safeKeystrokes = Array.isArray(keystrokes) ? keystrokes : [];
    const safePastes = Array.isArray(pastes) ? pastes : [];
    const safeEdits = Array.isArray(edits) ? edits : [];
    const safeDuration = sessionDurationMs > 0 ? sessionDurationMs : 0;

    const alphaCount = safeKeystrokes.filter(
      (stroke) =>
        stroke?.keyCategory === "alpha" || stroke?.keyCategory === "numeric",
    ).length;
    const minutes = safeDuration > 0 ? safeDuration / 60000 : 0;
    const currentWpm = minutes > 0 ? round(alphaCount / 5 / minutes) : 0;
    const pasteChars = safePastes.reduce(
      (sum, paste) => sum + (paste?.insertedLength ?? 0),
      0,
    );
    const totalTextActivity = alphaCount + pasteChars;
    const pasteRatio =
      totalTextActivity > 0 ? pasteChars / totalTextActivity : 0;
    const editDensity = alphaCount > 0 ? safeEdits.length / alphaCount : 0;
    const intervalSample = safeKeystrokes
      .slice(-30)
      .map((stroke) => stroke?.intervalMs ?? 0);
    const averageInterval =
      intervalSample.length > 0
        ? intervalSample.reduce((sum, value) => sum + value, 0) /
          intervalSample.length
        : 0;

    let naturalnessScore = 82;
    if (averageInterval > 0 && averageInterval < 70) {
      naturalnessScore -= 14;
    }
    if (averageInterval > 900) {
      naturalnessScore -= 8;
    }
    naturalnessScore -= Math.min(pasteRatio * 100, 35);
    if (editDensity < 0.03 && alphaCount > 40) {
      naturalnessScore -= 12;
    } else if (editDensity > 0.09) {
      naturalnessScore += 6;
    }

    return {
      currentWpm,
      sessionDurationMs: safeDuration,
      naturalnessScore: round(
        Math.min(Math.max(naturalnessScore, 0), 100),
      ),
      recentPasteDetected: safePastes.some(
        (paste) => Date.now() - (paste?.timestamp ?? 0) < 10000,
      ),
      pasteCount: safePastes.length,
    };
  }, [edits, keystrokes, pastes, sessionDurationMs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Live Indicator
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Writing behavior pulse
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              WPM
            </span>
            <p className="text-xl font-bold">{state.currentWpm}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Duration
            </span>
            <p className="text-xl font-bold">
              {Math.floor(state.sessionDurationMs / 1000)}s
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Naturalness
            </span>
            <p className="text-xl font-bold">{state.naturalnessScore}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Pastes
            </span>
            <p className="text-xl font-bold">{state.pasteCount}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${state.naturalnessScore}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {state.recentPasteDetected
              ? "Recent paste detected. Review source material."
              : "Behavior looks steady."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
