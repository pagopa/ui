"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

export interface OverlayProps extends Omit<React.ComponentProps<"div">, "children"> {
  visible: boolean
  /** Announced loading text. @default messages.overlay.label */
  label?: string
  children?: React.ReactNode
  showSpinner?: boolean
  className?: string
}

function Overlay({
  visible,
  label: labelProp,
  children,
  showSpinner = true,
  className,
  ref,
  ...props
}: OverlayProps) {
  const t = useMessages("overlay")
  const label = labelProp ?? t.label

  if (!visible) return null
  return (
    <div
      ref={ref}
      data-slot="overlay"
      role="status"
      aria-live="polite"
      className={cn(
        "pui:absolute pui:inset-0 pui:z-20 pui:grid pui:place-items-center pui:overflow-hidden pui:bg-overlay pui:p-6 pui:text-center pui:text-inverse-foreground",
        className,
      )}
      {...props}
    >
      <span className="pui:sr-only">{label}</span>
      {children ||
        (showSpinner && (
          <span
            aria-hidden="true"
            className="pui:size-9 pui:animate-spin pui:rounded-full pui:border-4 pui:border-inverse-foreground/40 pui:border-t-inverse-foreground pui:motion-reduce:animate-none"
          />
        ))}
    </div>
  )
}

export { Overlay }
