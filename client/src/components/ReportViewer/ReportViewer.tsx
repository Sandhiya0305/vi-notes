import type { AuthenticityReport } from '../../types';
import '../../styles/reportViewer.css';

interface ReportViewerProps {
  report: AuthenticityReport;
}

export default function ReportViewer({ report }: ReportViewerProps) {
  return (
    <section className="report-shell">
      <div className="report-header">
        <p className="eyebrow">Analysis Report</p>
        <h2>{report.verdict}</h2>
        <span>{report.confidenceScore}% confidence</span>
      </div>

      <div className="report-grid">
        <div className="report-metric">
          <span>Suspicion</span>
          <strong>{report.overallSuspicionScore}</strong>
        </div>
        <div className="report-metric">
          <span>Naturalness</span>
          <strong>{report.naturalnessScore}</strong>
        </div>
        <div className="report-metric">
          <span>Typing variance</span>
          <strong>{report.metrics.typingVariance}</strong>
        </div>
        <div className="report-metric">
          <span>Paste ratio</span>
          <strong>{Math.round(report.metrics.pasteRatio * 100)}%</strong>
        </div>
      </div>

      <ul className="report-reasons">
        {report.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
