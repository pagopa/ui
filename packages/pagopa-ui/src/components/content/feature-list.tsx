"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent } from "@/lib/ui-provider"

export interface Feature {
  title: string
  description?: string
  /** Icon indicator (source Indicator=Icon). */
  icon?: React.ReactNode
  /** Pictogram indicator. */
  pictogram?: React.ReactNode
  /** Optional "Scopri di più" link. */
  action?: { label: string; href: string }
}

export interface FeatureListProps extends Omit<React.ComponentProps<"ul">, "children"> {
  features: Feature[]
  /** Numeric markers instead of icons. */
  numbered?: boolean
  className?: string
  titleAs?: "h2" | "h3"
}

function FeatureList({
  features,
  numbered = false,
  className,
  titleAs: Title = "h3",
  ref,
  ...props
}: FeatureListProps) {
  const Link = useLinkComponent()
  return (
    <ul
      data-slot="feature-list"
      ref={ref}
      {...props}
      className={cn("pui:grid pui:gap-4 pui:tablet:grid-cols-2", className)}
    >
      {features.map((feature, index) => (
        <li key={feature.title} data-slot="feature" className="pui:flex pui:gap-4">
          {feature.pictogram ? (
            <span
              aria-hidden="true"
              className="pui:flex pui:w-10 pui:shrink-0 pui:flex-col pui:items-center pui:justify-center"
            >
              {feature.pictogram}
            </span>
          ) : feature.icon ? (
            <span
              aria-hidden="true"
              className="pui:flex pui:shrink-0 pui:items-center pui:text-decorative-secondary pui:[&>svg:not(.pagopa-icon)]:size-6"
            >
              {feature.icon}
            </span>
          ) : numbered ? (
            <span
              aria-hidden="true"
              className="pui:flex pui:w-6 pui:shrink-0 pui:items-center pui:text-body-sb pui:text-muted-foreground"
            >
              {index + 1}.
            </span>
          ) : null}
          <div className="pui:grid pui:min-w-0 pui:gap-2">
            <div className="pui:grid pui:gap-1">
              <Title className="pui:text-label-sb pui:text-muted-foreground">{feature.title}</Title>
              {feature.description ? (
                <p className="pui:text-label-mini pui:text-muted-foreground">
                  {feature.description}
                </p>
              ) : null}
            </div>
            {feature.action ? (
              <Link
                href={feature.action.href}
                className="pui:w-fit pui:text-body-sb pui:text-primary pui:underline pui:underline-offset-2 pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
              >
                {feature.action.label}
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export { FeatureList }
