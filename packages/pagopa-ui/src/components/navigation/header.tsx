"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent } from "@/lib/ui-provider"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

/** Props of {@link Header}. The identity slots are data, not children. */
interface HeaderProps {
  /** Product identity. */
  product: {
    /** Product or institution name. */
    label: string
    /** Turns the identity into a link when provided. */
    href?: string
    /** Optional logo; its presence replaces the chevron affordance. */
    logo?: React.ReactNode
  }
  /** Optional profile identity. */
  user?: {
    /** Entity name. */
    name: string
    /** Parent label, e.g. the institution. */
    parent?: string
    /** Role label. */
    role?: string
    /** Turns the profile into a link when provided. */
    href?: string
    /** Optional avatar of the identity. */
    avatar?: React.ReactNode
  }
  /** Optional actions of the header. */
  actions?: React.ReactNode
  /** ClassName applied to the header element. */
  className?: string
}

function Header({ product, user, actions, className }: HeaderProps) {
  const Link = useLinkComponent()
  const productContent = (
    <>
      {product.logo ? (
        <span aria-hidden="true" className="flex h-10 shrink-0 items-center">
          {product.logo}
        </span>
      ) : null}
      <span className="truncate text-title-sm-mobile text-foreground sm:text-title-sm">
        {product.label}
      </span>
      {/* Source `Logo=True`: the logo is the identity, the chevron is hidden.
          Source `Logo=False`: the chevron is `Icon/Neutral` on mobile (1298:5148)
          and `primary` on desktop (1298:5227). */}
      {product.logo ? null : (
        <PagoPAIcon
          name="chevron"
          variant="down"
          className="shrink-0 text-foreground sm:text-primary"
        />
      )}
    </>
  )
  // Source `Device=Mobile`: the profile collapses to the avatar (the identity
  // text stays announced, it is not painted) and the chevron goes with it.
  const userContent = user ? (
    <>
      {user.avatar ? <span className="shrink-0">{user.avatar}</span> : null}
      <span className="sr-only min-w-0 flex-col gap-0.5 text-left sm:not-sr-only sm:flex">
        {/* Source order (`User name`, 1298:5227): the parent line (14/20
            semibold) above the entity name (18/26 semibold), then the role. */}
        {user.parent ? (
          <span className="truncate text-label-mini-sb text-foreground">{user.parent}</span>
        ) : null}
        <span className="truncate text-body-big-sb text-foreground">{user.name}</span>
        {user.role ? (
          <span className="truncate text-label-mini text-muted-foreground">{user.role}</span>
        ) : null}
      </span>
      <PagoPAIcon
        name="chevron"
        variant="down"
        className="hidden shrink-0 text-foreground sm:block"
      />
    </>
  ) : null

  return (
    <header className={cn("border-b bg-background", className)}>
      {/* Mobile 320x77 and desktop 1200x103 share the bar: the source keeps a
          single row at both devices and only the identity collapses. */}
      <div className="mx-auto flex min-h-19 max-w-7xl items-center justify-between gap-2 px-6 py-4 sm:min-h-(--header-height) sm:gap-6">
        {product.href ? (
          <Link
            href={product.href}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {productContent}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">{productContent}</div>
        )}
        <div className="flex shrink-0 items-center gap-2 sm:gap-6">
          {user ? (
            user.href ? (
              <Link
                href={user.href}
                className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {userContent}
              </Link>
            ) : (
              <div className="flex min-w-0 items-center gap-2">{userContent}</div>
            )
          ) : null}
          {actions}
        </div>
      </div>
    </header>
  )
}

export { Header, type HeaderProps }
