import type { AuthenticityReport } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ReportViewerProps {
  report: AuthenticityReport;
}

export default function ReportViewer({ report }: ReportViewerProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Analysis Report
            </p>
            <CardTitle className="text-lg">{report.verdict}</CardTitle>
          </div>
          <Badge
            variant={
              report.verdict?.toLowerCase() === "human"
                ? "success"
                : report.verdict?.toLowerCase().includes("assisted")
                  ? "warning"
                  : "destructive"
            }
          >
            {report.confidenceScore}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Suspicion
            </span>
            <p className="text-xl font-bold">{report.overallSuspicionScore}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Naturalness
            </span>
            <p className="text-xl font-bold">{report.naturalnessScore}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Typing Variance
            </span>
            <p className="text-xl font-bold">{report.metrics.typingVariance}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Paste Ratio
            </span>
            <p className="text-xl font-bold">
              {Math.round(report.metrics.pasteRatio * 100)}%
            </p>
          </div>
        </div>

        {report.reasons.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {report.reasons.map((reason) => (
              <li
                key={reason}
                className="rounded-md bg-muted/50 px-3 py-2 text-sm"
              >
                {reason}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
