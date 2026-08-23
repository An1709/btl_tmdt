import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  tone?: "primary" | "secondary" | "warning" | "info" | "destructive";
}

const toneClasses = {
  primary: "bg-primary-subtle text-primary",
  secondary: "bg-secondary-subtle text-secondary-subtle-foreground",
  warning: "bg-warning-subtle text-warning-subtle-foreground",
  info: "bg-info-subtle text-info-subtle-foreground",
  destructive: "bg-destructive-subtle text-destructive-subtle-foreground",
};

function StatCard({ label, value, icon, description, tone = "primary" }: StatCardProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-elevated p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", toneClasses[tone])} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-text-strong">{value}</p>
      {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
    </section>
  );
}

export default StatCard;
