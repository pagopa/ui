import * as React from "react"
import { cn } from "@/lib/cn"

import { ChevronDown } from "@/components/primitives/icons"
import { Separator } from "@/components/primitives/separator"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import type { NavItem } from "./nav-item"

interface SideNavProfile {
  title: string
  name: string
  action?: NavItem
  avatar?: React.ReactNode
}

function SideNav({
  title = "In questa sezione",
  items,
  profile,
  className,
}: {
  title?: string
  items: NavItem[]
  profile?: SideNavProfile
  className?: string
}) {
  return (
    <nav aria-label={title} className={cn("w-full bg-background sm:w-75", className)}>
      {/* Source `Condensed=True, Device=Mobile` (1519:2721): a 48px head with the
          menu icon, the section name and the bottom divider; the items below are
          full-bleed, as in the source's 320-wide panel. */}
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
      <div className="hidden sm:block sm:py-4">
        <NavLinks items={items} profile={profile} />
      </div>
    </nav>
  )
}

function NavLinks({
  items,
  profile,
  nested = false,
}: {
  items: NavItem[]
  profile?: SideNavProfile
  nested?: boolean
}) {
  return (
    <>
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "flex min-h-14 items-center gap-2 border-r-4 border-transparent py-4 pl-6 text-body-sb hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                nested ? "pr-6 pl-14" : "pr-5",
                item.current && "border-primary bg-selection-soft text-primary",
              )}
            >
              {item.icon ? (
                <span aria-hidden="true" className="flex shrink-0 items-center [&>svg]:size-6">
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 break-words">{item.label}</span>
              {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
            </a>
            {item.children?.length ? <NavLinks items={item.children} nested /> : null}
          </li>
        ))}
      </ul>
      {profile ? (
        <div className="mt-6 grid gap-6 pb-2">
          <div className="flex items-center gap-3 px-6">
            {profile.avatar}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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

export { SideNav, type SideNavProfile }
