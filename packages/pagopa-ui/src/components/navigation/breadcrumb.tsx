import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

export interface BreadcrumbItem {
  label: string
  href?: string
}

function Breadcrumb({
  className,
  "aria-label": ariaLabel = "Percorso di navigazione",
  ...props
}: {
  /** Additional classes for the navigation element. */
  className?: string
  /** Name of the navigation landmark. @default "Percorso di navigazione" */
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
  const compact = props.layout === "compact"
  const items = props.layout === "compact" ? [props.back] : props.items
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-body">
        {items.map((item, index) => {
          const current = !compact && index === items.length - 1
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex min-w-0 max-w-full items-center gap-1.5"
            >
              {index > 0 ? (
                <PagoPAIcon
                  name="chevron"
                  variant="right"
                  size={16}
                  className="breadcrumb-separator text-foreground opacity-80"
                />
              ) : null}
              {!current && item.href ? (
                <a
                  href={item.href}
                  className="inline-flex min-h-11 min-w-0 items-center gap-1 rounded-sm text-body-sb text-foreground underline-offset-4 [overflow-wrap:anywhere] hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {compact ? (
                    <PagoPAIcon name="arrow" variant="left" className="breadcrumb-back-icon" />
                  ) : null}
                  {item.label}
                </a>
              ) : (
                // Adaptation `shared-row-height` (node 124:3575): the non-interactive
                // current label shares the links' 44px row (the source rows are
                // 22/24px) and keeps its current-page semantics.
                <span
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 min-w-0 items-center [overflow-wrap:anywhere]",
                    current ? "text-muted-foreground" : "text-body-sb text-foreground",
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
