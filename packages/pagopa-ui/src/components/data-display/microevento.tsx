import * as React from "react"
import { cn } from "@/lib/cn"

import { CorrectionTag } from "@/components/content"

/**
 * Timeline micro-event: the correction tag for the current status, the event
 * description and, when present, the event time on its own line below the copy.
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
      <div className="flex min-w-0 flex-col gap-1">
        {invalid ? (
          <CorrectionTag label={label} status="not-valid" />
        ) : (
          <CorrectionTag label={label} status="valid" />
        )}
        <p className="text-label-mini text-foreground break-words">{title}</p>
        {time ? (
          <span className="text-caption leading-none uppercase text-muted-foreground">{time}</span>
        ) : null}
      </div>
    </div>
  )
}

export { MicroEvent }
