import type { AuthenticityReport } from '../../types';
import type { TextStatisticsSnapshot } from './textStatistics';

export interface CorrelationSnapshot {
  summary: string;
}

export default class CorrelationEngine {
  summarize(report: AuthenticityReport, textStats: TextStatisticsSnapshot): CorrelationSnapshot {
    const summary = `${report.verdict} at ${report.confidenceScore}% confidence across ${textStats.wordCount} words`;
    return { summary };
  }
}
