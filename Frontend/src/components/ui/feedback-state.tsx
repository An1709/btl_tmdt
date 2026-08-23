import * as React from "react"
import { Inbox, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

type FeedbackStateProps = React.ComponentProps<"section"> & {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
}

function StateContent({
  title,
  description,
  action,
  icon,
  className,
  ...props
}: FeedbackStateProps) {
  return (
    <section
      className={cn("flex min-h-48 flex-col items-center justify-center px-4 py-10 text-center", className)}
      {...props}
    >
      {icon && <div aria-hidden="true" className="mb-3 text-muted-foreground">{icon}</div>}
      <h2 className="text-base font-semibold text-text-strong">{title}</h2>
      {description && <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  )
}

function EmptyState({ icon = <Inbox className="size-7" />, ...props }: FeedbackStateProps) {
  return <StateContent data-slot="empty-state" icon={icon} {...props} />
}

function ErrorState({ icon = <TriangleAlert className="size-7" />, ...props }: FeedbackStateProps) {
  return <StateContent data-slot="error-state" role="alert" icon={icon} {...props} />
}

export { EmptyState, ErrorState }
