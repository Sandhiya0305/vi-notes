import type { AuthenticityReport, BehavioralMetrics, EditEvent, KeystrokeEvent, PasteEvent, TextStatisticsMetrics, Verdict, WritingSession } from '../../types';
import TextStatisticsService from './textStatistics';
import SuspiciousSegmentDetector from './suspiciousSegmentDetector';

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function countWords(text: string): number {
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

function getPauseBeforeSentences(keystrokes: KeystrokeEvent[], documentSnapshot: string): number[] {
  const pauses: number[] = [];
  let charIndex = 0;

  for (let i = 0; i < keystrokes.length; i++) {
    const keystroke = keystrokes[i];
    if (keystroke.key === '.' || keystroke.key === '!' || keystroke.key === '?') {
      // Found a sentence-ending punctuation
      if (i > 0) {
        // Get the pause before this keystroke
        pauses.push(keystroke.intervalMs);
      }
    }
  }

  return pauses;
}

function getMicroPausesNearPunctuation(keystrokes: KeystrokeEvent[]): number[] {
  const microPauses: number[] = [];
  const punctuation = ['!', '?', '.', ',', ';', ':'];

  for (let i = 0; i < keystrokes.length; i++) {
    const keystroke = keystrokes[i];

    if (punctuation.includes(keystroke.key)) {
      // Pause before punctuation (i-1) and after punctuation (i+1)
      if (i > 0 && keystrokes[i - 1].intervalMs > 0) {
        microPauses.push(keystrokes[i - 1].intervalMs);
      }
      if (i < keystrokes.length - 1 && keystroke.intervalMs > 0) {
        microPauses.push(keystroke.intervalMs);
      }
    }
  }

  return microPauses;
}

function getContextAwarePausePattern(keystrokes: KeystrokeEvent[], documentSnapshot: string): string {
  if (keystrokes.length < 10) return 'insufficient_data';

  const intervals = keystrokes.map((k) => k.intervalMs);
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Classify pause patterns
  const longPauses = intervals.filter((i) => i > avgInterval * 2).length;
  const normalPauses = intervals.filter((i) => i >= avgInterval * 0.8 && i <= avgInterval * 1.2).length;
  const fastTyping = intervals.filter((i) => i < avgInterval * 0.8).length;

  const longRatio = longPauses / intervals.length;
  const normalRatio = normalPauses / intervals.length;
  const fastRatio = fastTyping / intervals.length;

  if (longRatio > 0.3) return 'frequent_long_pauses'; // AI-like: thinking pattern
  if (fastRatio > 0.5 && longRatio < 0.1) return 'consistent_fast_typing'; // Human-like: flowing
  if (normalRatio > 0.6) return 'regular_cadence'; // Could be either
  if (longRatio > 0.15 && fastRatio > 0.3) return 'irregular_pattern'; // Mixed, unclear

  return 'balanced_pattern'; // Natural human variation
}

export function analyzeSessionBehavior(session: Pick<WritingSession, '_id' | 'documentSnapshot' | 'keystrokes' | 'pastes' | 'edits' | 'sessionDurationMs'>): AuthenticityReport {
  const typingVariance = getVariance(session.keystrokes);
  const averageIntervalMs = getAverageInterval(session.keystrokes);
  const pasteRatio = getPasteRatio(session.pastes, session.documentSnapshot);
  const editRatio = getEditRatio(session.edits, session.keystrokes);
  const wordCount = getWordCount(session.documentSnapshot);
  const documentLength = Math.max(session.documentSnapshot.length, 1);

  const totalPastedWords = session.pastes.reduce((sum, paste) => sum + countWords(paste.insertedText), 0);
  const hasLongPasteEvent = session.pastes.some((paste) => countWords(paste.insertedText) >= 10);

  // New behavioral metrics
  const pauseBeforeSentences = getPauseBeforeSentences(session.keystrokes, session.documentSnapshot);
  const microPausesNearPunctuation = getMicroPausesNearPunctuation(session.keystrokes);
  const contextAwarePausePattern = getContextAwarePausePattern(session.keystrokes, session.documentSnapshot);

  // Get text statistics
  const textStatsService = new TextStatisticsService();
  const textStats = textStatsService.analyze(session.documentSnapshot);

  // Calculate suspicion scores
  const varianceSuspicion = clamp(typingVariance < 45 ? (45 - typingVariance) * 1.4 : 0, 0, 35);
  const pasteSuspicion = clamp(pasteRatio * 100, 0, 45);
  const editSuspicion = clamp(editRatio < 0.04 ? (0.04 - editRatio) * 700 : 0, 0, 20);

  // Add pause pattern suspicion
  let pausePatternSuspicion = 0;
  if (contextAwarePausePattern === 'frequent_long_pauses') {
    pausePatternSuspicion = 15; // AI-like thinking pattern
  } else if (contextAwarePausePattern === 'irregular_pattern') {
    pausePatternSuspicion = 8;
  }

  // Add text statistics suspicion
  let textSuspicion = 0;
  if (textStats.lexicalDiversity < 30) {
    textSuspicion += 8; // Low vocabulary diversity
  }
  if (textStats.sentenceLengthVariation < 15) {
    textSuspicion += 5; // Uniform sentence lengths
  }
  if (textStats.linguisticIrregularities.length > 2) {
    textSuspicion += 3 * Math.min(textStats.linguisticIrregularities.length, 3);
  }

  let overallSuspicionScore = round(clamp(varianceSuspicion + pasteSuspicion + editSuspicion + pausePatternSuspicion + textSuspicion, 0, 100));
  if (hasLongPasteEvent) {
    overallSuspicionScore = Math.max(overallSuspicionScore, 70);
  }
  if (wordCount > 0 && totalPastedWords / wordCount > 0.5) {
    overallSuspicionScore = Math.max(overallSuspicionScore, 85);
  }
  const reasons: string[] = [];

  const heavyPasteEvent = session.pastes.some((paste) => paste.insertedLength / documentLength > 0.4);
  const highPaste = pasteRatio > 0.65 || heavyPasteEvent;

  if (highPaste) {
    reasons.push('More than 65% of the document arrived through large paste operations.');
    overallSuspicionScore = Math.max(overallSuspicionScore, 78);
  }

  if (hasLongPasteEvent) {
    reasons.push('Suspiciously large paste chunks (10+ words) were inserted at once.');
  }
  if (wordCount > 0 && totalPastedWords / wordCount > 0.5) {
    reasons.push('More than half of the finalized text arrived through pasted content.');
  }

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

  if (contextAwarePausePattern === 'frequent_long_pauses') {
    reasons.push('Pause patterns suggest AI-like thinking—extended pauses before complex text.');
  } else if (contextAwarePausePattern === 'consistent_fast_typing') {
    reasons.push('Consistent fast typing with minimal pauses—characteristic of human flow state.');
  }

  if (textStats.lexicalDiversity < 30) {
    reasons.push('Low lexical diversity—vocabulary is repetitive and limited.');
  } else if (textStats.lexicalDiversity > 70) {
    reasons.push('High lexical diversity—rich, varied vocabulary.');
  }

  if (session.sessionDurationMs < 15_000 && wordCount > 120) {
    reasons.push('The document length was reached in a very short session.');
  }

  const naturalnessScore = round(clamp(100 - overallSuspicionScore, 0, 100));

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

  const behavioralMetrics: BehavioralMetrics = {
    typingVariance: round(typingVariance),
    averageIntervalMs: round(averageIntervalMs),
    pauseBeforeSentences,
    microPausesNearPunctuation,
    contextAwarePausePattern,
    pasteRatio: round(pasteRatio, 3),
    editRatio: round(editRatio, 3),
  };

  const initialReport: AuthenticityReport = {
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
      textStatistics: textStats,
      behavioral: behavioralMetrics,
    },
  };

  // Detect suspicious segments
  const segmentDetector = new SuspiciousSegmentDetector();
  const suspiciousSegments = segmentDetector.detectSegments(session.documentSnapshot, initialReport);

  return {
    ...initialReport,
    suspiciousSegments: suspiciousSegments.length > 0 ? suspiciousSegments : undefined,
  };
}
