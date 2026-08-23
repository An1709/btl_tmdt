import type * as React from "react";

import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

function AdminPageHeader({ title, description, actions, className }: AdminPageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 border-b border-divider pb-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

type AdminPanelProps = React.ComponentProps<"section"> & {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

function AdminPanel({ title, description, action, children, className, ...props }: AdminPanelProps) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface-elevated", className)} {...props}>
      <div className="flex flex-col gap-3 border-b border-divider px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-strong">{title}</h2>
          {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export { AdminPageHeader, AdminPanel };
