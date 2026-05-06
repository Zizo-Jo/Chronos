import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        compact ? "py-6" : "py-12",
        className,
      )}
    >
      {icon && (
        <div className="h-12 w-12 rounded-2xl bg-secondary/60 border border-glass-border flex items-center justify-center text-muted-foreground mb-4">
          {icon}
        </div>
      )}
      <p className="font-display font-semibold text-base mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}