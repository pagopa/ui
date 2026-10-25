import * as React from "react"
import { cn } from "@/lib/cn"

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
  "relative min-h-0 shrink-0 border-0 px-0 text-body-sb after:absolute after:inset-x-0 after:-inset-y-3"

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
  return (
    <div
      data-slot="catalogue-card"
      className={cn(
        "flex w-full min-w-0 flex-col gap-6 rounded-lg bg-card p-6 text-foreground ring-1 ring-border",
        className,
      )}
      {...props}
    >
      <div data-slot="catalogue-card-content" className="flex min-w-0 flex-col gap-3">
        <div data-slot="catalogue-card-header" className="flex items-start gap-3">
          {avatar ? (
            <span data-slot="catalogue-card-avatar" className="inline-flex shrink-0">
              {avatar}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {eyebrow ? <p className="text-label-mini-sb text-primary">{eyebrow}</p> : null}
            <Title className="text-body-sb wrap-anywhere">{title}</Title>
            {organization ? (
              <p
                data-slot="catalogue-card-organization"
                className="text-body text-muted-foreground"
              >
                {organization}
              </p>
            ) : null}
          </div>
        </div>
        {description ? (
          <p
            data-slot="catalogue-card-description"
            className="min-w-0 text-body-small text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
        {tags.length ? (
          <ul data-slot="catalogue-card-tags" className="flex flex-wrap gap-2">
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
          className="flex min-h-6 items-center justify-between gap-6"
        >
          {actions.length ? (
            <div
              data-slot="catalogue-card-actions"
              className="flex min-w-0 flex-1 items-center gap-6"
            >
              {actions.map((action, index) =>
                action.href !== undefined ? (
                  <a
                    key={index}
                    href={action.href}
                    className={cn(buttonVariants({ variant: "ghost" }), actionClassName)}
                  >
                    {action.label}
                  </a>
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
            <div data-slot="catalogue-card-feedback" className="flex shrink-0 items-center gap-6">
              {feedback.map((icon, index) => (
                <span
                  key={index}
                  className="inline-flex size-6 shrink-0 items-center justify-center"
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
