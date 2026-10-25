"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent } from "@/lib/ui-provider"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { Skeleton } from "@/components/primitives/skeleton"

interface ListItemSuggestion {
  label: string
  icon?: React.ReactNode
}

interface ListItemProps {
  /** Source composition of the row. */
  variant?:
    | "informative"
    | "link"
    | "actionable"
    | "transactional"
    | "amount"
    | "error"
    | "skeleton"
  /** Artwork slot at the start of the row: icon, avatar or card. */
  leading?: React.ReactNode
  /** Supporting line of the row. */
  description?: string
  /** Main line of the row; emphasized in link and actionable rows. */
  value?: string
  /** Optional chip (source Chip Type=Default). */
  chip?: React.ReactNode
  /** Transactional row: recommendation line. */
  suggestion?: ListItemSuggestion
  /** Transactional row: primary amount. */
  amount?: string
  /** Error row: helper message. */
  helperText?: string
  /** Informative + CTA rows: text action. */
  action?: { label: string; onPress?: () => void }
  /** Actionable/Error rows: artwork, e.g. the copy or report glyph. */
  trailingIcon?: React.ReactNode
  /** Link row: the value becomes a native anchor. */
  href?: string
  /** Interactive rows render a native button. */
  onPress?: () => void
  /** Shows the chevron affordance; default: interactive rows except plain link rows. */
  chevron?: boolean
  /** Skeleton state of the row. */
  loading?: boolean
  className?: string
  id?: string
  "data-testid"?: string
  "aria-label"?: string
}

function ListItem({
  variant = "informative",
  leading,
  description,
  value,
  chip,
  suggestion,
  amount,
  helperText,
  action,
  trailingIcon,
  href,
  onPress,
  chevron,
  loading = false,
  className,
  ...props
}: ListItemProps) {
  const Link = useLinkComponent()
  const interactive = Boolean(href || onPress)
  const showChevron = chevron ?? (interactive && variant !== "link")
  const valueClassName = cn(
    variant === "amount" ? "text-title-md-mobile" : "text-body-sb",
    (variant === "link" || variant === "actionable") && "text-primary",
  )
  // Source Content stacks: Informative/Link/Actionable gap 6, Amount/Transactional
  // gap 2 and Error gap 0.
  const contentClassName = cn(
    "grid min-w-0 flex-1",
    variant === "error"
      ? "gap-0"
      : variant === "amount" || variant === "transactional"
        ? "gap-0.5"
        : "gap-1.5",
  )
  // The source Description+value block is a 0px stack (Amount/Transactional use 2).
  const pairClassName = cn(
    "grid",
    variant === "amount" || variant === "transactional" ? "gap-0.5" : "gap-0",
  )
  // Transactional rows put the value above the grey description in the source.
  const stackValueFirst = variant === "transactional"
  const descriptionLine = description ? (
    <span className="text-label-mini text-muted-foreground">{description}</span>
  ) : null
  const valueLine = value ? <span className={valueClassName}>{value}</span> : null

  const classes = cn(
    // Source row: 12px block padding, no inline padding — the row is
    // edge-to-edge and the container owns the horizontal inset.
    "flex w-full items-center gap-3 py-3 text-left",
    interactive &&
      "outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring",
    className,
  )

  if (loading) {
    return (
      <div aria-busy="true" className={classes} {...props}>
        <Skeleton className="size-6" />
        <span className="grid flex-1 gap-1.5">
          <Skeleton className="h-5.5 w-25" />
          <Skeleton className="h-4 w-50 rounded-lg" />
        </span>
      </div>
    )
  }

  const row = (
    <>
      {leading ? (
        <span
          aria-hidden="true"
          className="pointer-events-none inline-flex shrink-0 items-center [&_svg:not([class*='size-'])]:size-6"
        >
          {leading}
        </span>
      ) : null}
      <span className={contentClassName}>
        {descriptionLine || valueLine ? (
          <span className={pairClassName}>
            {stackValueFirst ? (
              <>
                {valueLine}
                {descriptionLine}
              </>
            ) : (
              <>
                {descriptionLine}
                {valueLine}
              </>
            )}
          </span>
        ) : null}
        {chip ? <span className="w-fit">{chip}</span> : null}
        {suggestion ? (
          <span className="flex items-center gap-1 text-label-mini text-han-purple">
            <span aria-hidden="true" className="shrink-0">
              {suggestion.icon ?? <PagoPAIcon name="how_to_reg" size={16} />}
            </span>
            {suggestion.label}
          </span>
        ) : null}
        {helperText ? <span className="text-label-mini text-destructive">{helperText}</span> : null}
      </span>
      {amount ? <span className="shrink-0 text-body-sb text-primary">{amount}</span> : null}
      {action ? (
        <Button
          type="button"
          variant="ghost"
          // Source CTA: a 16/22 text action 22px tall, not a 48px control.
          // The pointer target comes from the invisible ::after expansion.
          className="relative min-h-0 shrink-0 border-0 px-0 py-0 text-primary after:absolute after:-inset-y-3"
          onClick={action.onPress}
        >
          {action.label}
        </Button>
      ) : null}
      {trailingIcon ? (
        <span
          aria-hidden="true"
          className="pointer-events-none shrink-0 text-primary [&_svg:not([class*='size-'])]:size-6"
        >
          {trailingIcon}
        </span>
      ) : null}
      {showChevron ? (
        <PagoPAIcon
          name="chevron"
          variant="right"
          className="size-6 shrink-0 text-primary"
          aria-hidden="true"
        />
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {row}
      </Link>
    )
  }

  if (onPress) {
    return (
      <button type="button" className={classes} onClick={onPress} {...props}>
        {row}
      </button>
    )
  }

  return (
    <div className={classes} {...props}>
      {row}
    </div>
  )
}

export { ListItem, type ListItemSuggestion }
