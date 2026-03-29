import type { AuthenticityReport, TextStatisticsMetrics } from '../../types';

export interface CorrelationSnapshot {
  summary: string;
  correlationFindings: string[];
  correlationScore: number;
}

export default class CorrelationEngine {
  private round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  /**
   * Detect mismatches between behavioral patterns and content characteristics
   */
  private detectPatternMismatches(report: AuthenticityReport, textStats: TextStatisticsMetrics): string[] {
    const mismatches: string[] = [];

    if (!report.metrics.behavioral) {
      return mismatches;
    }

    const behavioral = report.metrics.behavioral;

    // Mismatch 1: Fast typing but complex vocabulary
    if (behavioral.averageIntervalMs < 80 && textStats.lexicalDiversity > 70) {
      mismatches.push('Fast typing speed contradicts highly sophisticated vocabulary—unusual pattern.');
    }

    // Mismatch 2: Slow typing but simple vocabulary
    if (behavioral.averageIntervalMs > 200 && textStats.lexicalDiversity < 35) {
      mismatches.push('Slow typing with repetitive/simple vocabulary—suggests AI composition.');
    }

    // Mismatch 3: Frequent long pauses but uniform sentence structure
    if (behavioral.contextAwarePausePattern === 'frequent_long_pauses' && textStats.sentenceLengthVariation < 20) {
      mismatches.push('Extended pauses combined with uniform sentence lengths—AI thinking pattern indicator.');
    }

    // Mismatch 4: Fast, flowing typing but high linguistic irregularities
    if (behavioral.contextAwarePausePattern === 'consistent_fast_typing' && textStats.linguisticIrregularities.length > 2) {
      mismatches.push('Inconsistent: Natural typing flow contradicted by multiple linguistic oddities.');
    }

    // Mismatch 5: High paste ratio but refined vocabulary
    if (report.metrics.pasteRatio > 0.35 && textStats.lexicalDiversity > 65) {
      mismatches.push('Heavy paste usage contradicts naturally refined vocabulary—likely pasted from curated sources.');
    }

    // Mismatch 6: Many edits but increasing lexical complexity
    if (report.metrics.editRatio > 0.15 && textStats.lexicalRichness > 60) {
      mismatches.push('Extensive revision with complex vocabulary—manual refinement of sophisticated content.');
    }

    return mismatches;
  }

  /**
   * Calculate correlation score based on behavioral-content alignment
   */
  private calculateCorrelationScore(report: AuthenticityReport, textStats: TextStatisticsMetrics): number {
    let correlationScore = 50; // Neutral baseline
    if (!report.metrics.behavioral) {
      return correlationScore;
    }

    const behavioral = report.metrics.behavioral;

    // Strong human indicators correlate with specific text patterns
    if (behavioral.typingVariance > 70 && textStats.lexicalDiversity > 50) {
      correlationScore += 15; // Natural variation + diverse vocabulary = human
    }

    // AI indicators: uniform typing + uniform text
    if (behavioral.typingVariance < 40 && textStats.sentenceLengthVariation < 20) {
      correlationScore -= 20; // Both uniform = AI
    }

    // Pause pattern correlation
    if (behavioral.contextAwarePausePattern === 'frequent_long_pauses') {
      if (textStats.lexicalDiversity < 40) {
        correlationScore -= 15; // Thinking pauses + simple vocab = AI
      } else if (textStats.lexicalRichness > 55) {
        correlationScore -= 8; // Thinking pauses + complex vocab = AI composing
      }
    }

    // Edit pattern correlation
    if (report.metrics.editRatio > 0.12) {
      if (textStats.sentenceLengthVariation > 40) {
        correlationScore += 10; // Heavy editing + varied sentences = human iteration
      }
    }

    // Paste pattern correlation
    if (report.metrics.pasteRatio > 0.25) {
      if (textStats.linguisticIrregularities.length > 1) {
        correlationScore += 5; // Paste + irregularities = mixed human/pasted content
      } else {
        correlationScore -= 10; // Paste + clean = AI-generated pasted content
      }
    }

    return Math.max(0, Math.min(100, correlationScore));
  }

  /**
   * Generate behavioral insights based on typing patterns
   */
  private generateBehavioralInsights(report: AuthenticityReport): string[] {
    const insights: string[] = [];
    if (!report.metrics.behavioral) {
      return insights;
    }

    const behavioral = report.metrics.behavioral;

    if (behavioral.pauseBeforeSentences.length > 0) {
      const avgPauseBeforeSentence = behavioral.pauseBeforeSentences.reduce((a, b) => a + b, 0) / behavioral.pauseBeforeSentences.length;
      if (avgPauseBeforeSentence > 300) {
        insights.push(`Pauses before sentence-ending punctuation average ${this.round(avgPauseBeforeSentence)}ms—deliberate composition.`);
      }
    }

    if (behavioral.microPausesNearPunctuation.length > 0) {
      const avgMicroPause = behavioral.microPausesNearPunctuation.reduce((a, b) => a + b, 0) / behavioral.microPausesNearPunctuation.length;
      if (avgMicroPause > 150) {
        insights.push('Micro-pauses near punctuation suggest careful attention to grammar/syntax.');
      }
    }

    return insights;
  }

  /**
   * Generate text insights based on linguistic patterns
   */
  private generateTextInsights(textStats: TextStatisticsMetrics): string[] {
    const insights: string[] = [];

    if (textStats.sentenceLengthVariation > 60) {
      insights.push('High sentence length variation indicates diverse writing structure.');
    } else if (textStats.sentenceLengthVariation < 15) {
      insights.push('Uniform sentence lengths suggest repetitive or templated writing.');
    }

    if (textStats.lexicalRichness > 65) {
      insights.push('Rich vocabulary with many unique words—sophisticated authorship.');
    } else if (textStats.lexicalRichness < 25) {
      insights.push('Low lexical richness—content reuses common words frequently.');
    }

    if (textStats.linguisticIrregularities.length > 0) {
      insights.push(`Detected ${textStats.linguisticIrregularities.length} linguistic irregularities: ${textStats.linguisticIrregularities.slice(0, 2).join('; ')}`);
    }

    return insights;
  }

  summarize(report: AuthenticityReport, textStats: TextStatisticsMetrics): CorrelationSnapshot {
    const mismatches = this.detectPatternMismatches(report, textStats);
    const correlationScore = this.calculateCorrelationScore(report, textStats);
    const behavioralInsights = this.generateBehavioralInsights(report);
    const textInsights = this.generateTextInsights(textStats);

    const correlationFindings: string[] = [
      ...mismatches,
      ...behavioralInsights,
      ...textInsights,
    ];

    let summary = `${report.verdict} at ${report.confidenceScore}% confidence across ${textStats.wordCount} words`;

    if (correlationScore > 70) {
      summary += ' with strong behavioral-content alignment (human-like).';
    } else if (correlationScore < 40) {
      summary += ' with concerning behavioral-content misalignment (AI-like).';
    } else {
      summary += ' with mixed behavioral-content signals.';
    }

    if (mismatches.length > 0) {
      summary += ` ${mismatches.length} pattern mismatches detected.`;
    }

    return {
      summary,
      correlationFindings,
      correlationScore: this.round(correlationScore),
    };
  }
}
