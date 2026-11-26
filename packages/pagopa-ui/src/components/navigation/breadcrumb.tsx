"use client"

import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { useLinkComponent, useMessages } from "@/lib/ui-provider"

export interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * Navigation path to the current page, or a single back link in the compact layout.
 *
 * Figma: Breadcrumbs (node 123:7768)
 */
function Breadcrumb({
  className,
  "aria-label": ariaLabelProp,
  ...props
}: {
  /** Additional classes for the navigation element. */
  className?: string
  /** Name of the navigation landmark. @default messages.breadcrumb.ariaLabel */
  "aria-label"?: string
} & (
  | {
      /** Source layout: the full path. @default "extended" */
      layout?: "extended"
      /** Ancestor items; the last one is the current page. */
      items: BreadcrumbItem[]
      back?: never
    }
  | {
      /** Source compact layout: a back link instead of the path. */
      layout: "compact"
      /** Back link; it replaces the path. */
      back: { label: string; href: string }
      items?: never
    }
)) {
  const t = useMessages("breadcrumb")
  const ariaLabel = ariaLabelProp ?? t.ariaLabel
  const Link = useLinkComponent()
  const compact = props.layout === "compact"
  const items = props.layout === "compact" ? [props.back] : props.items
  return (
    <nav data-slot="breadcrumb" aria-label={ariaLabel} className={className}>
      <ol className="pui:flex pui:min-w-0 pui:flex-wrap pui:items-center pui:gap-1.5 pui:text-body">
        {items.map((item, index) => {
          const current = !compact && index === items.length - 1
          return (
            <li
              key={`${item.label}-${index}`}
              className="pui:flex pui:min-w-0 pui:max-w-full pui:items-center pui:gap-1.5"
            >
              {index > 0 ? (
                <PagoPAIcon
                  name="chevron"
                  variant="right"
                  size={16}
                  className="breadcrumb-separator pui:text-foreground pui:opacity-80"
                />
              ) : null}
              {!current && item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    "pui:relative pui:inline-flex pui:min-w-0 pui:items-center pui:gap-1 pui:rounded-sm pui:text-body-sb pui:text-foreground pui:underline-offset-4 pui:[overflow-wrap:anywhere] pui:after:absolute pui:after:inset-x-0 pui:hover:text-primary pui:hover:underline pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring",
                    // Invisible 44px target over the source row: 22 + 2 × 12 (Extended), 24 + 2 × 10 (Compact).
                    compact ? "pui:after:-inset-y-2.5" : "pui:after:-inset-y-3",
                  )}
                >
                  {compact ? (
                    <PagoPAIcon name="arrow" variant="left" className="breadcrumb-back-icon" />
                  ) : null}
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "pui:inline-flex pui:min-w-0 pui:items-center pui:[overflow-wrap:anywhere]",
                    current ? "pui:text-muted-foreground" : "pui:text-body-sb pui:text-foreground",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Breadcrumb }
