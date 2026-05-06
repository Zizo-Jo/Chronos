import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
  children?: ReactNode;
}

export function StatCard({ label, value, hint, icon, accent, className, children }: StatCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-3xl p-6 transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5 relative overflow-hidden group",
        accent && "gradient-border",
        className
      )}
    >
      {accent && (
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-primary opacity-20 blur-3xl group-hover:opacity-30 transition-opacity" />
      )}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          {icon && <div className="text-muted-foreground/70">{icon}</div>}
        </div>
        <div className="font-display text-3xl font-semibold tracking-tight mb-1">{value}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {children}
      </div>
    </div>
  );
}
