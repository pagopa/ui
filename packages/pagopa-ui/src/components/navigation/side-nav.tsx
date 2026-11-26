"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent, useMessages } from "@/lib/ui-provider"

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

export interface SideNavProps {
  /** Accessible name of the section. @default messages.sideNav.title */
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
}

function SideNav({
  title: titleProp,
  items,
  profile,
  condensed = false,
  expandLabel = defaultExpandLabel,
  collapseLabel = defaultCollapseLabel,
  className,
}: SideNavProps) {
  const t = useMessages("sideNav")
  const title = titleProp ?? t.title

  const [expanded, setExpanded] = React.useState(false)
  return (
    <nav
      aria-label={title}
      data-condensed={condensed || undefined}
      className={cn(
        "pui:w-full pui:bg-background",
        condensed ? "pui:tablet:w-18" : "pui:tablet:w-75",
        className,
      )}
    >
      {/* Source `Condensed=True, Device=Mobile` (1519:2721): a 48px head with the
          menu icon, the section name and the bottom divider; the items below are
          full-bleed, as in the source's 320-wide panel. The condensed rail is a
          desktop composition: below `sm` the disclosure stays the same. */}
      <details className="group pui:tablet:hidden">
        <summary className="pui:flex pui:min-h-12 pui:cursor-pointer pui:list-none pui:items-center pui:gap-2 pui:border-b pui:px-6 pui:py-3 pui:text-body-sb pui:focus-visible:outline-2 pui:focus-visible:outline-ring">
          <PagoPAIcon name="menu" aria-hidden="true" className="pui:shrink-0" />
          <span className="pui:min-w-0 pui:flex-1 pui:truncate">{title}</span>
          <PagoPAIcon
            name="chevron"
            variant="down"
            className="pui:shrink-0 pui:transition-transform pui:group-open:rotate-180 pui:motion-reduce:transition-none"
          />
        </summary>
        <NavLinks items={items} profile={profile} />
      </details>
      <div className="pui:relative pui:hidden pui:tablet:block pui:tablet:py-4">
        <div
          className={cn(
            "group/nav pui:relative pui:z-30 pui:bg-background",
            condensed &&
              "pui:w-18 pui:shadow-16 pui:transition-[width] pui:duration-150 pui:focus-within:w-75 pui:motion-reduce:transition-none",
            condensed && expanded && "pui:w-75",
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
  const Link = useLinkComponent()
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
            "pui:mt-6 pui:grid pui:gap-6 pui:pb-2",
            condensed && "pui:group-data-[expanded=true]/nav:block",
          )}
        >
          <div className="pui:flex pui:items-center pui:gap-3 pui:px-6">
            {profile.avatar}
            <div
              className={cn(
                "pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:gap-0.5",
                condensed &&
                  "pui:sr-only pui:group-data-[expanded=true]/nav:not-sr-only pui:group-focus-within/nav:not-sr-only",
              )}
            >
              <span className="pui:text-label-mini pui:text-muted-foreground">{profile.title}</span>
              <span className="pui:truncate pui:text-body-big-sb pui:text-foreground">
                {profile.name}
              </span>
              {profile.action ? (
                <Link
                  href={profile.action.href}
                  className="pui:w-fit pui:text-label-mini pui:text-primary pui:underline-offset-4 pui:hover:underline pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
                >
                  {profile.action.label}
                </Link>
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
  const Link = useLinkComponent()
  const hasChildren = Boolean(item.children?.length)
  const [open, setOpen] = React.useState(() => Boolean(item.children?.some(hasCurrentItem)))
  const labelsHidden = condensed
    ? "pui:sr-only pui:group-data-[expanded=true]/nav:not-sr-only pui:group-focus-within/nav:not-sr-only"
    : undefined

  return (
    <li>
      <div
        className={cn(
          "pui:flex pui:min-h-14 pui:items-center pui:border-r-4 pui:border-transparent pui:hover:bg-muted",
          condensed && "pui:justify-center",
          item.current && "pui:border-primary pui:bg-selection-soft pui:text-primary",
        )}
      >
        <Link
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            "pui:flex pui:min-h-14 pui:min-w-0 pui:flex-1 pui:items-center pui:gap-2 pui:py-4 pui:text-body-sb pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring",
            nested ? "pui:pr-6 pui:pl-14" : "pui:pr-5 pui:pl-6",
            "pui:relative",
            condensed &&
              "pui:justify-center pui:px-0 pui:group-data-[expanded=true]/nav:justify-start pui:group-data-[expanded=true]/nav:pl-6 pui:group-data-[expanded=true]/nav:pr-5 pui:group-focus-within/nav:justify-start pui:group-focus-within/nav:pl-6 pui:group-focus-within/nav:pr-5",
          )}
        >
          {item.icon ? (
            <span
              aria-hidden="true"
              className="pui:relative pui:flex pui:shrink-0 pui:items-center pui:[&>svg]:size-6"
            >
              {item.icon}
              {condensed && item.badgeCount != null ? (
                // Source: the numeric badge becomes a compact dot on the
                // icon's corner; the count stays in the accessible name.
                <Badge
                  display="sidenav-icon"
                  selected={item.current}
                  aria-hidden="true"
                  className="pui:absolute pui:-top-1.5 pui:-right-1.5 pui:size-3"
                />
              ) : null}
            </span>
          ) : null}
          <span className={cn("pui:min-w-0 pui:flex-1 pui:break-words", labelsHidden)}>
            {item.label}
          </span>
          {item.badgeCount != null ? (
            condensed ? (
              <>
                {item.icon ? null : (
                  <Badge
                    display="sidenav-icon"
                    selected={item.current}
                    aria-hidden="true"
                    className="pui:absolute pui:top-2 pui:right-3 pui:size-3"
                  />
                )}
                <span className="pui:sr-only">{item.badgeLabel ?? String(item.badgeCount)}</span>
              </>
            ) : (
              <span className="pui:shrink-0">
                <Badge display="numbered">{item.badgeCount}</Badge>
              </span>
            )
          ) : item.badge ? (
            <span className={cn("pui:shrink-0", condensed && labelsHidden)}>{item.badge}</span>
          ) : null}
          {item.chip ? (
            <span
              className={cn(
                "pui:shrink-0",
                condensed &&
                  "pui:hidden pui:group-data-[expanded=true]/nav:block pui:group-focus-within/nav:block",
              )}
            >
              {item.chip}
            </span>
          ) : null}
        </Link>
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? collapseLabel(item.label) : expandLabel(item.label)}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              // `not-sr-only` resets width and height to auto, which would shrink
              // the toggle to its 20px icon and break the 24px target minimum: the
              // minimums keep the 44px box in both rail states.
              "pui:mr-1 pui:grid pui:min-h-11 pui:min-w-11 pui:shrink-0 pui:place-items-center pui:rounded-sm pui:outline-none pui:hover:bg-foreground/5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring",
              condensed && labelsHidden,
            )}
          >
            <PagoPAIcon
              name="chevron"
              variant="down"
              className={cn(
                "pui:size-5 pui:transition-transform pui:motion-reduce:transition-none",
                open && "pui:rotate-180",
              )}
            />
          </button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <div
          className={cn(
            condensed &&
              "pui:hidden pui:group-data-[expanded=true]/nav:block pui:group-focus-within/nav:block",
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
