import { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:items-end md:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight break-words">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1.5 break-words">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
