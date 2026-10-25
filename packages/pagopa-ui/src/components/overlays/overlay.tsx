"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

function Overlay({
  visible,
  label: labelProp,
  children,
  showSpinner = true,
  className,
}: {
  visible: boolean
  /** Announced loading text. @default messages.overlay.label */
  label?: string
  children?: React.ReactNode
  showSpinner?: boolean
  className?: string
}) {
  const t = useMessages("overlay")
  const label = labelProp ?? t.label

  if (!visible) return null
  return (
    <div
      data-slot="overlay"
      role="status"
      aria-live="polite"
      className={cn(
        "absolute inset-0 z-20 grid place-items-center overflow-hidden bg-overlay p-6 text-center text-inverse-foreground",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      {children ||
        (showSpinner && (
          <span
            aria-hidden="true"
            className="size-9 animate-spin rounded-full border-4 border-inverse-foreground/40 border-t-inverse-foreground motion-reduce:animate-none"
          />
        ))}
    </div>
  )
}

export { Overlay }
