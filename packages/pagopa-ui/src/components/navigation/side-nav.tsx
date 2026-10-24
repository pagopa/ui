import * as React from "react"
import { cn } from "@/lib/cn"

import { ChevronDown } from "@/components/primitives/icons"
import { Badge } from "@/components/primitives/badge"
import { Separator } from "@/components/primitives/separator"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import type { NavItem } from "./nav-item"

interface SideNavProfile {
  title: string
  name: string
  action?: NavItem
  avatar?: React.ReactNode
}

const defaultExpandLabel = (label: string) => `Espandi ${label}`
const defaultCollapseLabel = (label: string) => `Comprimi ${label}`

function hasCurrentItem(item: NavItem): boolean {
  return Boolean(item.current || item.children?.some(hasCurrentItem))
}

function SideNav({
  title = "In questa sezione",
  items,
  profile,
  condensed = false,
  expandLabel = defaultExpandLabel,
  collapseLabel = defaultCollapseLabel,
  className,
}: {
  title?: string
  items: NavItem[]
  profile?: SideNavProfile
  /** Desktop rail: icons only, expanding as an overlay on hover or focus. @default false */
  condensed?: boolean
  /** Accessible name of a closed parent toggle, from its label. @default "Espandi {label}" */
  expandLabel?: (label: string) => string
  /** Accessible name of an open parent toggle, from its label. @default "Comprimi {label}" */
  collapseLabel?: (label: string) => string
  className?: string
}) {
  const [expanded, setExpanded] = React.useState(false)
  return (
    <nav
      aria-label={title}
      data-condensed={condensed || undefined}
      className={cn("w-full bg-background", condensed ? "sm:w-18" : "sm:w-75", className)}
    >
      {/* Source `Condensed=True, Device=Mobile` (1519:2721): a 48px head with the
          menu icon, the section name and the bottom divider; the items below are
          full-bleed, as in the source's 320-wide panel. The condensed rail is a
          desktop composition: below `sm` the disclosure stays the same. */}
      <details className="group sm:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 border-b px-6 py-3 text-body-sb focus-visible:outline-2 focus-visible:outline-ring">
          <PagoPAIcon name="menu" aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <ChevronDown
            aria-hidden="true"
            className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <NavLinks items={items} profile={profile} />
      </details>
      <div className="relative hidden sm:block sm:py-4">
        <div
          className={cn(
            "group/nav relative z-30 bg-background",
            condensed &&
              "w-18 shadow-16 transition-[width] duration-150 focus-within:w-75 motion-reduce:transition-none",
            condensed && expanded && "w-75",
          )}
          data-slot="side-nav-panel"
          data-expanded={condensed && expanded ? "true" : undefined}
          onMouseEnter={() => {
            if (condensed) setExpanded(true)
          }}
          onMouseLeave={() => setExpanded(false)}
        >
          <NavLinks
            items={items}
            profile={profile}
            condensed={condensed}
            expandLabel={expandLabel}
            collapseLabel={collapseLabel}
          />
        </div>
      </div>
    </nav>
  )
}

function NavLinks({
  items,
  profile,
  nested = false,
  condensed = false,
  expandLabel = defaultExpandLabel,
  collapseLabel = defaultCollapseLabel,
}: {
  items: NavItem[]
  profile?: SideNavProfile
  nested?: boolean
  condensed?: boolean
  expandLabel?: (label: string) => string
  collapseLabel?: (label: string) => string
}) {
  return (
    <>
      <ul>
        {items.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            nested={nested}
            condensed={condensed}
            expandLabel={expandLabel}
            collapseLabel={collapseLabel}
          />
        ))}
      </ul>
      {profile ? (
        <div
          className={cn(
            "mt-6 grid gap-6 pb-2",
            condensed && "group-data-[expanded=true]/nav:block",
          )}
        >
          <div className="flex items-center gap-3 px-6">
            {profile.avatar}
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-0.5",
                condensed &&
                  "sr-only group-data-[expanded=true]/nav:not-sr-only group-focus-within/nav:not-sr-only",
              )}
            >
              <span className="text-label-mini text-muted-foreground">{profile.title}</span>
              <span className="truncate text-body-big-sb text-foreground">{profile.name}</span>
              {profile.action ? (
                <a
                  href={profile.action.href}
                  className="w-fit text-label-mini text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {profile.action.label}
                </a>
              ) : null}
            </div>
          </div>
          <Separator />
        </div>
      ) : null}
    </>
  )
}

function NavRow({
  item,
  nested,
  condensed,
  expandLabel,
  collapseLabel,
}: {
  item: NavItem
  nested: boolean
  condensed: boolean
  expandLabel: (label: string) => string
  collapseLabel: (label: string) => string
}) {
  const hasChildren = Boolean(item.children?.length)
  const [open, setOpen] = React.useState(() => Boolean(item.children?.some(hasCurrentItem)))
  const labelsHidden = condensed
    ? "sr-only group-data-[expanded=true]/nav:not-sr-only group-focus-within/nav:not-sr-only"
    : undefined

  return (
    <li>
      <div
        className={cn(
          "flex min-h-14 items-center border-r-4 border-transparent hover:bg-muted",
          condensed && "justify-center",
          item.current && "border-primary bg-selection-soft text-primary",
        )}
      >
        <a
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            "flex min-h-14 min-w-0 flex-1 items-center gap-2 py-4 text-body-sb focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            nested ? "pr-6 pl-14" : "pr-5 pl-6",
            "relative",
            condensed &&
              "justify-center px-0 group-data-[expanded=true]/nav:justify-start group-data-[expanded=true]/nav:pl-6 group-data-[expanded=true]/nav:pr-5 group-focus-within/nav:justify-start group-focus-within/nav:pl-6 group-focus-within/nav:pr-5",
          )}
        >
          {item.icon ? (
            <span aria-hidden="true" className="relative flex shrink-0 items-center [&>svg]:size-6">
              {item.icon}
              {condensed && item.badgeCount != null ? (
                // Source: the numeric badge becomes a compact dot on the
                // icon's corner; the count stays in the accessible name.
                <Badge
                  display="sidenav-icon"
                  selected={item.current}
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-1.5 size-3"
                />
              ) : null}
            </span>
          ) : null}
          <span className={cn("min-w-0 flex-1 break-words", labelsHidden)}>{item.label}</span>
          {item.badgeCount != null ? (
            condensed ? (
              <>
                {item.icon ? null : (
                  <Badge
                    display="sidenav-icon"
                    selected={item.current}
                    aria-hidden="true"
                    className="absolute top-2 right-3 size-3"
                  />
                )}
                <span className="sr-only">{item.badgeLabel ?? String(item.badgeCount)}</span>
              </>
            ) : (
              <span className="shrink-0">
                <Badge display="numbered">{item.badgeCount}</Badge>
              </span>
            )
          ) : item.badge ? (
            <span className={cn("shrink-0", condensed && labelsHidden)}>{item.badge}</span>
          ) : null}
          {item.chip ? (
            <span
              className={cn(
                "shrink-0",
                condensed &&
                  "hidden group-data-[expanded=true]/nav:block group-focus-within/nav:block",
              )}
            >
              {item.chip}
            </span>
          ) : null}
        </a>
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? collapseLabel(item.label) : expandLabel(item.label)}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "mr-1 grid size-11 shrink-0 place-items-center rounded-sm outline-none hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
              condensed && labelsHidden,
            )}
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-5 transition-transform motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <div
          className={cn(
            condensed && "hidden group-data-[expanded=true]/nav:block group-focus-within/nav:block",
          )}
        >
          <NavLinks
            items={item.children ?? []}
            nested
            condensed={condensed}
            expandLabel={expandLabel}
            collapseLabel={collapseLabel}
          />
        </div>
      ) : null}
    </li>
  )
}

export { SideNav, type SideNavProfile }
