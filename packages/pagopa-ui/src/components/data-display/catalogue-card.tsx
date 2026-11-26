"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent } from "@/lib/ui-provider"

import { InputChip } from "@/components/inputs"
import { Button, buttonVariants } from "@/components/primitives/button"

/** One source text action: a native link with `href`, a native button with `onPress`. */
type CatalogueCardAction = {
  label: string
} & ({ href: string; onPress?: never } | { href?: never; onPress: () => void })

type CatalogueCardProps = React.ComponentProps<"div"> & {
  /** Caller-owned header avatar, e.g. `Avatar size="small"`. */
  avatar?: React.ReactNode
  /** Card title; rendered as a genuine heading. */
  title: string
  titleAs?: "h2" | "h3"
  /** Organisation line (source `Ente`). */
  organization?: string
  /** Supporting description. */
  description?: React.ReactNode
  /** Action row of the card. */
  actions?: CatalogueCardAction[]
  /** Feedback glyphs of the card. */
  feedback?: React.ReactNode[]
  /** Extension: short annotation of the card. */
  eyebrow?: string
  /** Extension: `InputChip` tags of the card. */
  tags?: string[]
}

// Text actions keep the source 22px line box: `min-h-0`/`px-0`/`border-0` undo the
// Button box (the source `Variant=Text` instance is a bare 22px line) and the
// >=44px pointer target comes from the invisible ::after expansion.
const actionClassName =
  "pui:relative pui:min-h-0 pui:shrink-0 pui:border-0 pui:px-0 pui:text-body-sb pui:after:absolute pui:after:inset-x-0 pui:after:-inset-y-3"

// The source stroke is INSIDE-aligned on the 360x236 frame and its 24px padding is
// measured from the outer edge: the `ring-1` (the Card family's model for the same
// `#e8ebf1` source stroke) keeps the box and the resulting 312px content width.
function CatalogueCard({
  avatar,
  title,
  titleAs: Title = "h3",
  organization,
  description,
  actions = [],
  feedback = [],
  eyebrow,
  tags = [],
  children,
  className,
  ...props
}: CatalogueCardProps) {
  const Link = useLinkComponent()
  return (
    <div
      data-slot="catalogue-card"
      className={cn(
        "pui:flex pui:w-full pui:min-w-0 pui:flex-col pui:gap-6 pui:rounded-lg pui:bg-card pui:p-6 pui:text-foreground pui:ring-1 pui:ring-border",
        className,
      )}
      {...props}
    >
      <div
        data-slot="catalogue-card-content"
        className="pui:flex pui:min-w-0 pui:flex-col pui:gap-3"
      >
        <div data-slot="catalogue-card-header" className="pui:flex pui:items-start pui:gap-3">
          {avatar ? (
            <span data-slot="catalogue-card-avatar" className="pui:inline-flex pui:shrink-0">
              {avatar}
            </span>
          ) : null}
          <div className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:gap-0.5">
            {eyebrow ? <p className="pui:text-label-mini-sb pui:text-primary">{eyebrow}</p> : null}
            <Title className="pui:text-body-sb pui:wrap-anywhere">{title}</Title>
            {organization ? (
              <p
                data-slot="catalogue-card-organization"
                className="pui:text-body pui:text-muted-foreground"
              >
                {organization}
              </p>
            ) : null}
          </div>
        </div>
        {description ? (
          <p
            data-slot="catalogue-card-description"
            className="pui:min-w-0 pui:text-body-small pui:text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
        {tags.length ? (
          <ul data-slot="catalogue-card-tags" className="pui:flex pui:flex-wrap pui:gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <InputChip>{tag}</InputChip>
              </li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
      {actions.length || feedback.length ? (
        <div
          data-slot="catalogue-card-action"
          className="pui:flex pui:min-h-6 pui:items-center pui:justify-between pui:gap-6"
        >
          {actions.length ? (
            <div
              data-slot="catalogue-card-actions"
              className="pui:flex pui:min-w-0 pui:flex-1 pui:items-center pui:gap-6"
            >
              {actions.map((action, index) =>
                action.href !== undefined ? (
                  <Link
                    key={index}
                    href={action.href}
                    className={cn(buttonVariants({ variant: "ghost" }), actionClassName)}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <Button
                    key={index}
                    type="button"
                    variant="ghost"
                    className={actionClassName}
                    onClick={action.onPress}
                  >
                    {action.label}
                  </Button>
                ),
              )}
            </div>
          ) : null}
          {feedback.length ? (
            <div
              data-slot="catalogue-card-feedback"
              className="pui:flex pui:shrink-0 pui:items-center pui:gap-6"
            >
              {feedback.map((icon, index) => (
                <span
                  key={index}
                  className="pui:inline-flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center"
                >
                  {icon}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { CatalogueCard, type CatalogueCardAction, type CatalogueCardProps }
