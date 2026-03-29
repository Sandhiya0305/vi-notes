import { useMemo } from 'react';
import type { EditEvent, KeystrokeEvent, LiveIndicatorState, PasteEvent } from '../../types';
import '../../styles/liveIndicator.css';

interface LiveIndicatorProps {
  keystrokes: KeystrokeEvent[];
  pastes: PasteEvent[];
  edits: EditEvent[];
  sessionDurationMs: number;
}

function round(value: number): number {
  return Math.round(value);
}

export default function LiveIndicator({ keystrokes, pastes, edits, sessionDurationMs }: LiveIndicatorProps) {
  const state = useMemo<LiveIndicatorState>(() => {
    const safeKeystrokes = Array.isArray(keystrokes) ? keystrokes : [];
    const safePastes = Array.isArray(pastes) ? pastes : [];
    const safeEdits = Array.isArray(edits) ? edits : [];
    const safeDuration = sessionDurationMs > 0 ? sessionDurationMs : 0;

    const alphaCount = safeKeystrokes.filter(
      (stroke) => stroke?.keyCategory === 'alpha' || stroke?.keyCategory === 'numeric'
    ).length;
    const minutes = safeDuration > 0 ? safeDuration / 60000 : 0;
    const currentWpm = minutes > 0 ? round((alphaCount / 5) / minutes) : 0;
    const pasteChars = safePastes.reduce((sum, paste) => sum + (paste?.insertedLength ?? 0), 0);
    const totalTextActivity = alphaCount + pasteChars;
    const pasteRatio = totalTextActivity > 0 ? pasteChars / totalTextActivity : 0;
    const editDensity = alphaCount > 0 ? safeEdits.length / alphaCount : 0;
    const intervalSample = safeKeystrokes.slice(-30).map((stroke) => stroke?.intervalMs ?? 0);
    const averageInterval =
      intervalSample.length > 0
        ? intervalSample.reduce((sum, value) => sum + value, 0) / intervalSample.length
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
      naturalnessScore: round(Math.min(Math.max(naturalnessScore, 0), 100)),
      recentPasteDetected: safePastes.some((paste) => Date.now() - (paste?.timestamp ?? 0) < 10000),
      pasteCount: safePastes.length,
    };
  }, [edits, keystrokes, pastes, sessionDurationMs]);

  return (
    <aside className="indicator-card">
      <div className="indicator-header">
        <p className="eyebrow">Live Indicator</p>
        <h3>Writing behavior pulse</h3>
      </div>

      <div className="indicator-grid">
        <div className="indicator-metric">
          <span>WPM</span>
          <strong>{state.currentWpm}</strong>
        </div>
        <div className="indicator-metric">
          <span>Duration</span>
          <strong>{Math.floor(state.sessionDurationMs / 1000)}s</strong>
        </div>
        <div className="indicator-metric">
          <span>Naturalness</span>
          <strong>{state.naturalnessScore}</strong>
        </div>
        <div className="indicator-metric">
          <span>Pastes</span>
          <strong>{state.pasteCount}</strong>
        </div>
      </div>

      <div className="indicator-status">
        <div className="status-bar">
          <div className="status-fill" style={{ width: `${state.naturalnessScore}%` }} />
        </div>
        <p>{state.recentPasteDetected ? 'Recent paste detected. Review source material.' : 'Behavior looks steady.'}</p>
      </div>
    </aside>
  );
}
