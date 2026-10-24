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

function FeatureList({
  features,
  numbered = false,
  className,
  titleAs: Title = "h3",
}: {
  features: Feature[]
  /** Numeric markers instead of icons. */
  numbered?: boolean
  className?: string
  titleAs?: "h2" | "h3"
}) {
  const Link = useLinkComponent()
  return (
    <ul data-slot="feature-list" className={cn("grid gap-4 tablet:grid-cols-2", className)}>
      {features.map((feature, index) => (
        <li key={feature.title} data-slot="feature" className="flex gap-4">
          {feature.pictogram ? (
            <span
              aria-hidden="true"
              className="flex w-10 shrink-0 flex-col items-center justify-center"
            >
              {feature.pictogram}
            </span>
          ) : feature.icon ? (
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center text-decorative-secondary [&>svg]:size-6"
            >
              {feature.icon}
            </span>
          ) : numbered ? (
            <span
              aria-hidden="true"
              className="flex w-6 shrink-0 items-center text-body-sb text-muted-foreground"
            >
              {index + 1}.
            </span>
          ) : null}
          <div className="grid min-w-0 gap-2">
            <div className="grid gap-1">
              <Title className="text-label-sb text-muted-foreground">{feature.title}</Title>
              {feature.description ? (
                <p className="text-label-mini text-muted-foreground">{feature.description}</p>
              ) : null}
            </div>
            {feature.action ? (
              <Link
                href={feature.action.href}
                className="w-fit text-body-sb text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
