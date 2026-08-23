import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg"
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
  closeLabel?: string
  className?: string
}

const dialogSizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnEscape = true,
  closeOnBackdrop = true,
  closeLabel = "Đóng hộp thoại",
  className,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const focusDialog = () => {
      const panel = panelRef.current
      if (!panel) return
      const initialFocus = panel.querySelector<HTMLElement>("[data-autofocus]")
        ?? panel.querySelector<HTMLElement>(focusableSelector)
      ;(initialFocus ?? panel).focus()
    }
    const frameId = window.requestAnimationFrame(focusDialog)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault()
        onOpenChange(false)
        return
      }

      if (event.key !== "Tab" || !panelRef.current) return

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      if (focusable.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frameId)
      document.body.style.overflow = originalOverflow
      document.removeEventListener("keydown", handleKeyDown)
      previouslyFocusedRef.current?.focus()
    }
  }, [closeOnEscape, onOpenChange, open])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      data-slot="dialog-overlay"
      className="fixed inset-0 z-dialog flex items-center justify-center bg-overlay px-4 py-6"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-slot="dialog"
        className={cn(
          "bg-surface-elevated text-foreground max-h-[calc(100dvh-3rem)] w-full overflow-y-auto rounded-lg border border-border shadow-elevation-3 outline-none",
          dialogSizes[size],
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-text-strong">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label={closeLabel}>
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-border px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
}

export { Dialog, DialogFooter }
