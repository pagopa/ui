"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "@/lib/cn"

import { type ElementProps } from "./props"

const verticalPaddingClasses = {
  16: "pui:py-4",
  24: "pui:py-6",
  32: "pui:py-8",
} as const

const horizontalInsetClasses = {
  16: "pui:w-4",
  24: "pui:w-6",
  32: "pui:w-8",
} as const

/** Props of the `Separator`. */
export type SeparatorProps = ElementProps<"div"> & {
  /** Direction of the line. @default "horizontal" */
  orientation?: "horizontal" | "vertical"
  /** Optional label; renders the source "With text" divider. */
  label?: React.ReactNode
  /** Source spacing steps; `0` keeps the plain line. @default 0 */
  padding?: 0 | 16 | 24 | 32
}

function Separator({
  className,
  orientation = "horizontal",
  label,
  padding = 0,
  ...props
}: SeparatorProps) {
  if (label !== undefined) {
    return (
      <div
        data-slot="separator"
        data-separator-variant="with-text"
        className={cn(
          "pui:flex pui:w-full pui:items-center pui:gap-2 pui:text-label-mini pui:text-muted-foreground",
          padding === 0 ? undefined : verticalPaddingClasses[padding],
          className,
        )}
      >
        <span
          aria-hidden="true"
          data-separator-segment=""
          data-slot="separator-line-before"
          className="pui:h-px pui:flex-1 pui:bg-border"
        />
        <span data-separator-segment="" data-slot="separator-label">
          {label}
        </span>
        <span
          aria-hidden="true"
          data-separator-segment=""
          data-slot="separator-line-after"
          className="pui:h-px pui:flex-1 pui:bg-border"
        />
      </div>
    )
  }

  const line = (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "pui:shrink-0 pui:bg-border pui:data-horizontal:h-px pui:data-horizontal:w-full pui:data-vertical:w-px pui:data-vertical:self-stretch",
        padding === 0 && className,
      )}
      {...props}
    />
  )
  if (padding === 0) return line
  if (orientation === "vertical") {
    return (
      <div data-slot="separator" className={cn(verticalPaddingClasses[padding], className)}>
        {line}
      </div>
    )
  }
  return (
    <div data-slot="separator" className={cn("pui:flex pui:w-full pui:items-center", className)}>
      <span
        aria-hidden="true"
        data-separator-segment=""
        className={cn("pui:h-px pui:shrink-0", horizontalInsetClasses[padding])}
      />
      <SeparatorPrimitive
        data-slot="separator"
        data-separator-segment=""
        orientation={orientation}
        className="pui:min-w-0 pui:flex-1 pui:bg-border pui:data-horizontal:h-px"
        {...props}
      />
      <span
        aria-hidden="true"
        data-separator-segment=""
        className={cn("pui:h-px pui:shrink-0", horizontalInsetClasses[padding])}
      />
    </div>
  )
}

export { Separator }
