import * as React from "react"
import { cn } from "@/lib/cn"

const levelStyles = {
  // The source L1 style is Titillio-Bold (cssWeight 700): the type-scale token
  // carries that weight, an explicit `font-semibold` is the wrong face.
  1: "text-title-xs-mobile md:text-title-xs",
  2: "text-body-sb",
  3: "text-label-mini-sb leading-[1.2] uppercase text-muted-foreground",
} as const

function SectionHeader({
  icon,
  title,
  status,
  actions,
  level = 1,
  titleAs: Title = "h1",
  className,
}: {
  /** Decorative icon (source "Decorative icon"). */
  icon?: React.ReactNode
  title: React.ReactNode
  /** Source Chip of the header. */
  status?: React.ReactNode
  /** Action slot: an IconButton or a text action. */
  actions?: React.ReactNode
  /** Source heading level: 1, 2 or 3, from the largest to the smallest. */
  level?: 1 | 2 | 3
  titleAs?: "h1" | "h2" | "h3"
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
        {icon ? (
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center text-choice-icon [&>svg]:size-6"
          >
            {icon}
          </span>
        ) : null}
        {/* The source groups the title with the chip: one row on desktop,
            stacked under the title on the narrow grid, FILL grow=1 in both. */}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2.5">
          <Title className={cn("min-w-0", levelStyles[level])}>{title}</Title>
          {status ? <span className="shrink-0">{status}</span> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export { SectionHeader }
