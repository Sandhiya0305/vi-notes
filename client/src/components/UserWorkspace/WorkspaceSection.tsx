import type { ReactNode } from 'react';

interface WorkspaceSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function WorkspaceSection({
  title,
  action,
  children,
}: WorkspaceSectionProps) {
  return (
    <section className="workspace-section-card">
      <div className="workspace-section-card__header">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
