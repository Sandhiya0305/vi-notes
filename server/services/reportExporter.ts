import type { AuthenticityReport } from '../types';

export interface ExportedReport {
  format: 'json' | 'html' | 'text';
  content: string;
  mimeType: string;
  filename: string;
}

export default class ReportExporter {
  /**
   * Export report as JSON
   */
  exportAsJson(report: AuthenticityReport): ExportedReport {
    const content = JSON.stringify(report, null, 2);
    return {
      format: 'json',
      content,
      mimeType: 'application/json',
      filename: `authenticity-report-${report.sessionId}.json`,
    };
  }

  /**
   * Export report as HTML (shareable, styled)
   */
  exportAsHtml(report: AuthenticityReport): ExportedReport {
    const verdictColor = {
      HUMAN: '#10b981',
      AI_ASSISTED: '#f59e0b',
      AI_GENERATED: '#ef4444',
    }[report.verdict];

    const suspiciousSegmentsHtml = report.suspiciousSegments
      ? report.suspiciousSegments
          .map(
            (segment) =>
              `<div class="segment segment-${segment.suspicionLevel}">
        <p><strong>${segment.reason}</strong></p>
        <blockquote>"${segment.text}"</blockquote>
      </div>`,
          )
          .join('')
      : '<p>No suspicious segments detected.</p>';

    const metricsHtml = report.metrics.textStatistics
      ? `
      <div class="metrics-section">
        <h3>Text Statistics</h3>
        <ul>
          <li>Word Count: <strong>${report.metrics.textStatistics.wordCount}</strong></li>
          <li>Average Word Length: <strong>${report.metrics.textStatistics.averageWordLength}</strong></li>
          <li>Sentence Count: <strong>${report.metrics.textStatistics.sentenceCount}</strong></li>
          <li>Sentence Length Variation: <strong>${report.metrics.textStatistics.sentenceLengthVariation}%</strong></li>
          <li>Lexical Diversity: <strong>${report.metrics.textStatistics.lexicalDiversity}%</strong></li>
          <li>Lexical Richness: <strong>${report.metrics.textStatistics.lexicalRichness}%</strong></li>
        </ul>
        ${report.metrics.textStatistics.linguisticIrregularities.length > 0 ? `<p><strong>Linguistic Irregularities:</strong> ${report.metrics.textStatistics.linguisticIrregularities.join('; ')}</p>` : ''}
      </div>
    `
      : '';

    const behavioralHtml = report.metrics.behavioral
      ? `
      <div class="metrics-section">
        <h3>Behavioral Metrics</h3>
        <ul>
          <li>Typing Variance: <strong>${report.metrics.behavioral.typingVariance}ms</strong></li>
          <li>Average Interval: <strong>${report.metrics.behavioral.averageIntervalMs}ms</strong></li>
          <li>Pause Pattern: <strong>${report.metrics.behavioral.contextAwarePausePattern}</strong></li>
          <li>Paste Ratio: <strong>${(report.metrics.behavioral.pasteRatio * 100).toFixed(1)}%</strong></li>
          <li>Edit Ratio: <strong>${(report.metrics.behavioral.editRatio * 100).toFixed(1)}%</strong></li>
        </ul>
      </div>
    `
      : '';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authenticity Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f9fafb;
      color: #111827;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 40px;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .verdict-badge {
      display: inline-block;
      background: ${verdictColor};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 18px;
      margin-top: 20px;
    }
    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .score-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .score-card h3 { font-size: 14px; color: #6b7280; margin-bottom: 10px; }
    .score-value { font-size: 32px; font-weight: bold; color: #1f2937; }
    .reasons {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 40px;
    }
    .reasons h2 { font-size: 20px; margin-bottom: 20px; color: #1f2937; }
    .reasons ul { list-style: none; }
    .reasons li {
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: flex-start;
    }
    .reasons li:last-child { border-bottom: none; }
    .reasons li:before {
      content: "→";
      color: #667eea;
      font-weight: bold;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .segments {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 40px;
    }
    .segments h2 { font-size: 20px; margin-bottom: 20px; color: #1f2937; }
    .segment {
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 12px;
      border-left: 4px solid #ccc;
    }
    .segment-high { background: #fee2e2; border-left-color: #ef4444; }
    .segment-medium { background: #fef3c7; border-left-color: #f59e0b; }
    .segment-low { background: #dbeafe; border-left-color: #3b82f6; }
    .segment p { font-size: 14px; color: #374151; margin-bottom: 8px; }
    .segment blockquote {
      font-style: italic;
      color: #6b7280;
      padding: 8px 12px;
      background: rgba(255,255,255,0.5);
      border-radius: 4px;
      font-size: 13px;
    }
    .metrics-section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 40px;
    }
    .metrics-section h3 { font-size: 18px; margin-bottom: 16px; color: #1f2937; }
    .metrics-section ul { list-style: none; }
    .metrics-section li {
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
    }
    .metrics-section li:last-child { border-bottom: none; }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 13px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    @media (max-width: 640px) {
      .container { padding: 20px; }
      .header { padding: 20px; }
      .header h1 { font-size: 24px; }
      .score-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Authenticity Analysis Report</h1>
      <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
      <div class="verdict-badge">${report.verdict} • ${report.confidenceScore}% Confident</div>
    </div>

    <div class="score-grid">
      <div class="score-card">
        <h3>Confidence Score</h3>
        <div class="score-value">${report.confidenceScore}%</div>
      </div>
      <div class="score-card">
        <h3>Naturalness Score</h3>
        <div class="score-value">${report.naturalnessScore}%</div>
      </div>
      <div class="score-card">
        <h3>Suspicion Score</h3>
        <div class="score-value">${report.overallSuspicionScore}%</div>
      </div>
    </div>

    <div class="reasons">
      <h2>Analysis Findings</h2>
      <ul>
        ${report.reasons.map((reason) => `<li>${reason}</li>`).join('')}
      </ul>
    </div>

    ${report.suspiciousSegments ? `<div class="segments"><h2>Suspicious Segments</h2>${suspiciousSegmentsHtml}</div>` : ''}

    ${metricsHtml}
    ${behavioralHtml}

    <div class="footer">
      <p>This report analyzes writing patterns, textual characteristics, and behavioral metrics to assess authenticity.</p>
      <p>Session ID: ${report.sessionId}</p>
    </div>
  </div>
</body>
</html>
    `;

    return {
      format: 'html',
      content: html,
      mimeType: 'text/html',
      filename: `authenticity-report-${report.sessionId}.html`,
    };
  }

  /**
   * Export report as plain text
   */
  exportAsText(report: AuthenticityReport): ExportedReport {
    let text = `AUTHENTICITY ANALYSIS REPORT
Generated: ${new Date(report.generatedAt).toLocaleString()}

VERDICT: ${report.verdict}
Confidence: ${report.confidenceScore}%
Naturalness: ${report.naturalnessScore}%
Suspicion Score: ${report.overallSuspicionScore}%

═══════════════════════════════════════════════════════════════

ANALYSIS FINDINGS:
${report.reasons.map((reason) => `• ${reason}`).join('\n')}

═══════════════════════════════════════════════════════════════

TEXT STATISTICS:
${report.metrics.textStatistics ? `• Word Count: ${report.metrics.textStatistics.wordCount}
• Average Word Length: ${report.metrics.textStatistics.averageWordLength}
• Sentence Count: ${report.metrics.textStatistics.sentenceCount}
• Sentence Length Variation: ${report.metrics.textStatistics.sentenceLengthVariation}%
• Lexical Diversity: ${report.metrics.textStatistics.lexicalDiversity}%
• Lexical Richness: ${report.metrics.textStatistics.lexicalRichness}%
${report.metrics.textStatistics.linguisticIrregularities.length > 0 ? `• Linguistic Irregularities: ${report.metrics.textStatistics.linguisticIrregularities.join('; ')}\n` : ''}` : 'Not available'}

═══════════════════════════════════════════════════════════════

BEHAVIORAL METRICS:
${report.metrics.behavioral ? `• Typing Variance: ${report.metrics.behavioral.typingVariance}ms
• Average Interval: ${report.metrics.behavioral.averageIntervalMs}ms
• Pause Pattern: ${report.metrics.behavioral.contextAwarePausePattern}
• Paste Ratio: ${(report.metrics.behavioral.pasteRatio * 100).toFixed(1)}%
• Edit Ratio: ${(report.metrics.behavioral.editRatio * 100).toFixed(1)}%` : 'Not available'}

═══════════════════════════════════════════════════════════════

SUSPICIOUS SEGMENTS:
${report.suspiciousSegments && report.suspiciousSegments.length > 0 ? report.suspiciousSegments.map((segment) => `[${segment.suspicionLevel.toUpperCase()}] "${segment.text.substring(0, 100)}"
  Reason: ${segment.reason}`).join('\n\n') : 'None detected'}

═══════════════════════════════════════════════════════════════

Session ID: ${report.sessionId}
    `;

    return {
      format: 'text',
      content: text,
      mimeType: 'text/plain',
      filename: `authenticity-report-${report.sessionId}.txt`,
    };
  }

  /**
   * Generate a shareable URL-safe report token
   */
  generateShareableToken(report: AuthenticityReport): string {
    const compressed = JSON.stringify({
      verdict: report.verdict,
      confidence: report.confidenceScore,
      suspicion: report.overallSuspicionScore,
      timestamp: report.generatedAt,
    });

    // Simple base64 encoding for demo purposes
    return Buffer.from(compressed).toString('base64').replace(/[+/]/g, (c) => (c === '+' ? '-' : '_'));
  }

  /**
   * Export in the requested format
   */
  export(report: AuthenticityReport, format: 'json' | 'html' | 'text' = 'html'): ExportedReport {
    switch (format) {
      case 'json':
        return this.exportAsJson(report);
      case 'text':
        return this.exportAsText(report);
      case 'html':
      default:
        return this.exportAsHtml(report);
    }
  }
}
