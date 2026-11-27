import * as React from "react"
import { cn } from "@/lib/cn"

import type { HeadingTag } from "@/components/primitives/heading"

const levelStyles = {
  // The source L1 style is Titillio-Bold (cssWeight 700): the type-scale token
  // carries that weight, an explicit `font-semibold` is the wrong face.
  1: "pui:text-title-xs-mobile pui:tablet-md:text-title-xs",
  2: "pui:text-body-sb",
  3: "pui:text-label-mini-sb pui:leading-[1.2] pui:uppercase pui:text-muted-foreground",
} as const

export interface SectionHeaderProps {
  /** Decorative icon (source "Decorative icon"). */
  icon?: React.ReactNode
  title: React.ReactNode
  /** Source Chip of the header. */
  status?: React.ReactNode
  /** Action slot: an IconButton or a text action. */
  actions?: React.ReactNode
  /** Source heading level: 1, 2 or 3, from the largest to the smallest. */
  level?: 1 | 2 | 3
  /** Heading element of the title. The page owns its single `h1`. */
  titleAs?: HeadingTag
  className?: string
}

function SectionHeader({
  icon,
  title,
  status,
  actions,
  level = 1,
  titleAs: Title = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "pui:flex pui:min-w-0 pui:items-center pui:justify-between pui:gap-4",
        className,
      )}
    >
      <div className="pui:flex pui:min-w-0 pui:flex-1 pui:items-start pui:gap-2 pui:tablet:items-center">
        {icon ? (
          <span
            aria-hidden="true"
            className="pui:flex pui:shrink-0 pui:items-center pui:text-choice-icon pui:[&>svg:not(.pagopa-icon)]:size-6"
          >
            {icon}
          </span>
        ) : null}
        {/* The source groups the title with the chip: one row on desktop,
            stacked under the title on the narrow grid, FILL grow=1 in both. */}
        <div className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:items-start pui:gap-1 pui:tablet:flex-row pui:tablet:items-center pui:tablet:gap-2.5">
          <Title className={cn("pui:min-w-0", levelStyles[level])}>{title}</Title>
          {status ? <span className="pui:shrink-0">{status}</span> : null}
        </div>
      </div>
      {actions ? (
        <div className="pui:flex pui:shrink-0 pui:flex-wrap pui:items-center pui:gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}

export { SectionHeader }
