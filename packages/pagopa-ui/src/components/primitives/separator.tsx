"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "@/lib/cn"

const verticalPaddingClasses = {
  16: "py-4",
  24: "py-6",
  32: "py-8",
} as const

const horizontalInsetClasses = {
  16: "w-4",
  24: "w-6",
  32: "w-8",
} as const

function Separator({
  className,
  orientation = "horizontal",
  label,
  padding = 0,
  ...props
}: SeparatorPrimitive.Props & {
  /** Optional label; renders the source "With text" divider. */
  label?: React.ReactNode
  /** Source spacing steps; `0` keeps the plain line. */
  padding?: 0 | 16 | 24 | 32
}) {
  if (label !== undefined) {
    return (
      <div
        data-slot="separator"
        data-separator-variant="with-text"
        className={cn(
          "flex w-full items-center gap-2 text-label-mini text-muted-foreground",
          padding === 0 ? undefined : verticalPaddingClasses[padding],
          className,
        )}
      >
        <span
          aria-hidden="true"
          data-separator-segment=""
          data-slot="separator-line-before"
          className="h-px flex-1 bg-border"
        />
        <span data-separator-segment="" data-slot="separator-label">
          {label}
        </span>
        <span
          aria-hidden="true"
          data-separator-segment=""
          data-slot="separator-line-after"
          className="h-px flex-1 bg-border"
        />
      </div>
    )
  }

  const line = (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        padding === 0 && className,
      )}
      {...props}
    />
  )
  if (padding === 0) return line
  if (orientation === "vertical") {
    return <div className={cn(verticalPaddingClasses[padding], className)}>{line}</div>
  }
  return (
    <div data-slot="separator-padding" className={cn("flex w-full items-center", className)}>
      <span
        aria-hidden="true"
        data-separator-segment=""
        className={cn("h-px shrink-0", horizontalInsetClasses[padding])}
      />
      <SeparatorPrimitive
        data-slot="separator"
        data-separator-segment=""
        orientation={orientation}
        className="min-w-0 flex-1 bg-border data-horizontal:h-px"
        {...props}
      />
      <span
        aria-hidden="true"
        data-separator-segment=""
        className={cn("h-px shrink-0", horizontalInsetClasses[padding])}
      />
    </div>
  )
}

export { Separator }
