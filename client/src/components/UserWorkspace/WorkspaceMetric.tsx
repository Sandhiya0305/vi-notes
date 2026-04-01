interface WorkspaceMetricProps {
  label: string;
  value: string | number;
  emphasis?: boolean;
}

export default function WorkspaceMetric({
  label,
  value,
  emphasis = false,
}: WorkspaceMetricProps) {
  return (
    <div className="metric-card">
      <p className="metric-card__label">{label}</p>
      <p className={emphasis ? 'metric-card__value metric-card__value--accent' : 'metric-card__value'}>
        {value}
      </p>
    </div>
  );
}
