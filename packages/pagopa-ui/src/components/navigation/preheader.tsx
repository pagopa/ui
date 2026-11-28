"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent, useMessages } from "@/lib/ui-provider"

import type { NavItem } from "./nav-item"

// Source institutional rows. The rows read label/href/icon/avatar only: the
// nav-item fields the preheader does not render stay out of the contract.
export type PreheaderLink = Omit<NavItem, "badge" | "children" | "current"> & {
  icon?: React.ReactNode
  avatar?: React.ReactNode
}

export interface PreheaderProps {
  /** Institution name; the link target follows `homeHref`. @default messages.preheader.institution */
  institution?: string
  /** Link target of the institution row; the `#` placeholder keeps the source default. @default "#" */
  homeHref?: string
  /** Institutional link rows, collapsed to icon/avatar on mobile. */
  links?: PreheaderLink[]
  /** Optional actions of the band. */
  actions?: React.ReactNode
  /** Accessible name of the institutional links navigation. @default messages.preheader.linksLabel */
  linksLabel?: string
}

function Preheader({
  institution: institutionProp,
  homeHref = "#",
  links = [],
  actions,
  linksLabel: linksLabelProp,
}: PreheaderProps) {
  const t = useMessages("preheader")
  const institution = institutionProp ?? t.institution
  const linksLabel = linksLabelProp ?? t.linksLabel

  const Link = useLinkComponent()
  return (
    <div data-slot="preheader" className="pui:bg-background">
      {/* Source band: 54px content + the 1px divider in every variant
          (1315:11011), regardless of whether an action button is present. */}
      <div className="pui:mx-auto pui:flex pui:min-h-(--pui-preheader-height) pui:max-w-7xl pui:flex-wrap pui:items-center pui:justify-between pui:gap-0 pui:border-b pui:px-6 pui:py-1 pui:tablet:gap-4">
        <Link
          href={homeHref}
          className="pui:inline-flex pui:min-h-10 pui:shrink-0 pui:items-center pui:rounded-sm pui:text-label-mini-sb pui:text-foreground pui:underline-offset-4 pui:hover:underline pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
        >
          {institution}
        </Link>
        <div className="pui:flex pui:min-w-0 pui:flex-wrap pui:items-center pui:gap-4 pui:tablet:gap-8">
          {links.length ? (
            <nav aria-label={linksLabel}>
              <ul className="pui:flex pui:flex-wrap pui:items-center pui:gap-4 pui:tablet:gap-8">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="pui:inline-flex pui:min-h-10 pui:min-w-0 pui:items-center pui:gap-2 pui:rounded-sm pui:text-label-mini-sb pui:text-foreground pui:underline-offset-4 pui:hover:underline pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
                    >
                      {/* Source `Device=Mobile` (1317:8182): a link collapses to
                          its 24px icon, or to its 32px avatar for the profile
                          row (the desktop artwork returns with the label); the
                          14/20 label stays announced, not painted. */}
                      {link.icon ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pui:flex pui:shrink-0 pui:items-center pui:[&>svg:not(.pagopa-icon)]:size-6",
                            link.avatar && "pui:max-tablet:hidden",
                          )}
                        >
                          {link.icon}
                        </span>
                      ) : null}
                      {link.avatar ? (
                        <span className="pui:shrink-0 pui:tablet:hidden">{link.avatar}</span>
                      ) : null}
                      <span
                        className={cn(
                          (link.icon || link.avatar) && "pui:sr-only pui:tablet:not-sr-only",
                        )}
                      >
                        {link.label}
                      </span>
                    </Link>
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
