import * as React from "react"

import { cn } from "@/lib/utils"

function Radio({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="radio"
      data-slot="radio"
      className={cn(
        "size-5 shrink-0 border-border-strong accent-primary outline-none transition-colors duration-base ease-standard disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:outline aria-invalid:outline-2 aria-invalid:outline-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Radio }
