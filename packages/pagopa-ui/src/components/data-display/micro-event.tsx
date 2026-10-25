import * as React from "react"
import { cn } from "@/lib/cn"

import { CorrectionNotValid, CorrectionValid } from "@/components/content"

/**
 * Timeline micro-event: the correction tag for the current status plus the
 * event description, optionally prefixed by its time.
 *
 * Figma: Microevento (node 9676:5633)
 */
function MicroEvent({
  title,
  time,
  invalid = true,
  label,
  className,
}: {
  title: React.ReactNode
  time?: string
  /** Source correction slot: warning "EVENTO NON VALIDO" or success "EVENTO RETTIFICATO". */
  invalid?: boolean
  label?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-start py-2 pl-7", className)}>
      {time ? <span className="shrink-0 text-label-mini text-muted-foreground">{time}</span> : null}
      <div className="flex min-w-0 flex-col gap-1">
        {invalid ? <CorrectionNotValid label={label} /> : <CorrectionValid label={label} />}
        <p className="text-label-mini text-foreground break-words">{title}</p>
      </div>
    </div>
  )
}

export { MicroEvent }
