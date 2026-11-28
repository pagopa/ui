import * as React from "react"
import { cn } from "@/lib/cn"

import { CorrectionTag } from "@/components/content"

/** Props of the timeline micro-event. */
export interface MicroEventProps extends Omit<React.ComponentProps<"div">, "children" | "title"> {
  title: React.ReactNode
  time?: string
  /** Source correction slot: warning "EVENTO NON VALIDO" or success "EVENTO RETTIFICATO". */
  invalid?: boolean
  label?: string
  className?: string
}

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
  ref,
  ...props
}: MicroEventProps) {
  return (
    <div
      ref={ref}
      data-slot="micro-event"
      className={cn("pui:flex pui:items-start pui:py-2 pui:pl-7", className)}
      {...props}
    >
      <div className="pui:flex pui:min-w-0 pui:flex-col pui:gap-1">
        {invalid ? (
          <CorrectionTag label={label} status="not-valid" />
        ) : (
          <CorrectionTag label={label} status="valid" />
        )}
        <p className="pui:text-label-mini pui:text-foreground pui:break-words">{title}</p>
        {time ? (
          <span className="pui:text-caption pui:leading-none pui:uppercase pui:text-muted-foreground">
            {time}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export { MicroEvent }
