import * as React from "react"
import { cn } from "@/lib/cn"

import type { NavItem } from "./nav-item"

// Source institutional rows. The rows read label/href/icon/avatar only: the
// nav-item fields the preheader does not render stay out of the contract.
export type PreheaderLink = Omit<NavItem, "badge" | "children" | "current"> & {
  icon?: React.ReactNode
  avatar?: React.ReactNode
}

function Preheader({
  institution = "PagoPA S.p.A.",
  homeHref = "#",
  links = [],
  actions,
  linksLabel = "Link istituzionali",
}: {
  /** Institution name; the link target follows `homeHref`. @default "PagoPA S.p.A." */
  institution?: string
  /** Link target of the institution row; the `#` placeholder keeps the source default. @default "#" */
  homeHref?: string
  /** Institutional link rows, collapsed to icon/avatar on mobile. */
  links?: PreheaderLink[]
  /** Optional actions of the band. */
  actions?: React.ReactNode
  /** Accessible name of the institutional links navigation. @default "Link istituzionali" */
  linksLabel?: string
}) {
  return (
    <div className="bg-background">
      {/* Source band: 54px content + the 1px divider in every variant
          (1315:11011), regardless of whether an action button is present. */}
      <div className="mx-auto flex min-h-(--preheader-height) max-w-7xl flex-wrap items-center justify-between gap-0 border-b px-6 py-1 sm:gap-4">
        <a
          href={homeHref}
          className="inline-flex min-h-10 shrink-0 items-center rounded-sm text-label-mini-sb text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {institution}
        </a>
        <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-8">
          {links.length ? (
            <nav aria-label={linksLabel}>
              <ul className="flex flex-wrap items-center gap-4 sm:gap-8">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-sm text-label-mini-sb text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {/* Source `Device=Mobile` (1317:8182): a link collapses to
                          its 24px icon, or to its 32px avatar for the profile
                          row (the desktop artwork returns with the label); the
                          14/20 label stays announced, not painted. */}
                      {link.icon ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex shrink-0 items-center [&>svg]:size-6",
                            link.avatar && "max-sm:hidden",
                          )}
                        >
                          {link.icon}
                        </span>
                      ) : null}
                      {link.avatar ? (
                        <span className="shrink-0 sm:hidden">{link.avatar}</span>
                      ) : null}
                      <span className={cn((link.icon || link.avatar) && "sr-only sm:not-sr-only")}>
                        {link.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {actions}
        </div>
      </div>
    </div>
  )
}

export { Preheader }
