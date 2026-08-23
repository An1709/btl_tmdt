import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border-strong placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground min-h-24 w-full rounded-md border bg-surface px-3 py-2 text-base shadow-elevation-1 transition-[color,background-color,border-color,box-shadow] duration-base ease-standard outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 md:text-sm",
        "focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
