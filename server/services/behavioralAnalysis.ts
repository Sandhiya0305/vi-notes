import type { AuthenticityReport, EditEvent, KeystrokeEvent, PasteEvent, Verdict, WritingSession } from '../../types';

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function getAverageInterval(keystrokes: KeystrokeEvent[]): number {
  if (keystrokes.length === 0) {
    return 0;
  }

  const total = keystrokes.reduce((sum, stroke) => sum + stroke.intervalMs, 0);
  return total / keystrokes.length;
}

function getVariance(keystrokes: KeystrokeEvent[]): number {
  if (keystrokes.length < 2) {
    return 0;
  }

  const intervals = keystrokes.map((stroke) => stroke.intervalMs);
  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const variance = intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length;
  return Math.sqrt(variance);
}

function getPasteRatio(pastes: PasteEvent[], documentSnapshot: string): number {
  const totalPastedChars = pastes.reduce((sum, paste) => sum + paste.insertedLength, 0);
  return totalPastedChars / Math.max(documentSnapshot.length, 1);
}

function getEditRatio(edits: EditEvent[], keystrokes: KeystrokeEvent[]): number {
  const totalEditDelta = edits.reduce((sum, edit) => sum + Math.abs(edit.delta), 0);
  return totalEditDelta / Math.max(keystrokes.length, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function analyzeSessionBehavior(session: Pick<WritingSession, '_id' | 'documentSnapshot' | 'keystrokes' | 'pastes' | 'edits' | 'sessionDurationMs'>): AuthenticityReport {
  const typingVariance = getVariance(session.keystrokes);
  const averageIntervalMs = getAverageInterval(session.keystrokes);
  const pasteRatio = getPasteRatio(session.pastes, session.documentSnapshot);
  const editRatio = getEditRatio(session.edits, session.keystrokes);
  const wordCount = getWordCount(session.documentSnapshot);

  const varianceSuspicion = clamp(typingVariance < 45 ? (45 - typingVariance) * 1.4 : 0, 0, 35);
  const pasteSuspicion = clamp(pasteRatio * 100, 0, 45);
  const editSuspicion = clamp(editRatio < 0.04 ? (0.04 - editRatio) * 700 : 0, 0, 20);

  const overallSuspicionScore = round(clamp(varianceSuspicion + pasteSuspicion + editSuspicion, 0, 100));
  const naturalnessScore = round(clamp(100 - overallSuspicionScore, 0, 100));

  const reasons: string[] = [];

  if (typingVariance >= 80) {
    reasons.push('Typing cadence shows healthy human-like variation.');
  } else if (typingVariance < 45) {
    reasons.push('Typing intervals are unusually uniform.');
  }

  if (pasteRatio > 0.45) {
    reasons.push('A large share of the document arrived through paste events.');
  } else if (pasteRatio > 0.18) {
    reasons.push('Paste activity is elevated compared with organic drafting.');
  } else {
    reasons.push('Most text appears to have been entered directly in the editor.');
  }

  if (editRatio < 0.04) {
    reasons.push('The draft contains very few corrections or revisions.');
  } else if (editRatio > 0.12) {
    reasons.push('Revision activity suggests iterative human editing.');
  }

  if (session.sessionDurationMs < 15_000 && wordCount > 120) {
    reasons.push('The document length was reached in a very short session.');
  }

  let verdict: Verdict = 'HUMAN';
  let confidenceScore = 82;

  if (overallSuspicionScore >= 70) {
    verdict = 'AI_GENERATED';
    confidenceScore = round(clamp(65 + (overallSuspicionScore - 70) * 1.1, 65, 98));
  } else if (overallSuspicionScore >= 38) {
    verdict = 'AI_ASSISTED';
    confidenceScore = round(clamp(58 + (overallSuspicionScore - 38) * 0.9, 58, 88));
  } else {
    verdict = 'HUMAN';
    confidenceScore = round(clamp(78 + (30 - overallSuspicionScore) * 0.4, 70, 96));
  }

  return {
    sessionId: session._id,
    generatedAt: new Date().toISOString(),
    verdict,
    confidenceScore,
    overallSuspicionScore,
    naturalnessScore,
    reasons,
    metrics: {
      typingVariance: round(typingVariance),
      averageIntervalMs: round(averageIntervalMs),
      pasteRatio: round(pasteRatio, 3),
      editRatio: round(editRatio, 3),
      wordCount,
    },
  };
}
