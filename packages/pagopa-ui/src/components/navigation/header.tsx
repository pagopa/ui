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
        <span aria-hidden="true" className="pui:flex pui:h-10 pui:shrink-0 pui:items-center">
          {product.logo}
        </span>
      ) : null}
      <span className="pui:truncate pui:text-title-sm-mobile pui:text-foreground pui:tablet:text-title-sm">
        {product.label}
      </span>
      {/* Source `Logo=True`: the logo is the identity, the chevron is hidden.
          Source `Logo=False`: the chevron is `Icon/Neutral` on mobile (1298:5148)
          and `primary` on desktop (1298:5227). */}
      {product.logo ? null : (
        <PagoPAIcon
          name="chevron"
          variant="down"
          className="pui:shrink-0 pui:text-foreground pui:tablet:text-primary"
        />
      )}
    </>
  )
  // Source `Device=Mobile`: the profile collapses to the avatar (the identity
  // text stays announced, it is not painted) and the chevron goes with it.
  const userContent = user ? (
    <>
      {user.avatar ? <span className="pui:shrink-0">{user.avatar}</span> : null}
      <span className="pui:sr-only pui:min-w-0 pui:flex-col pui:gap-0.5 pui:text-left pui:tablet:not-sr-only pui:tablet:flex">
        {/* Source order (`User name`, 1298:5227): the parent line (14/20
            semibold) above the entity name (18/26 semibold), then the role. */}
        {user.parent ? (
          <span className="pui:truncate pui:text-label-mini-sb pui:text-foreground">
            {user.parent}
          </span>
        ) : null}
        <span className="pui:truncate pui:text-body-big-sb pui:text-foreground">{user.name}</span>
        {user.role ? (
          <span className="pui:truncate pui:text-label-mini pui:text-muted-foreground">
            {user.role}
          </span>
        ) : null}
      </span>
      <PagoPAIcon
        name="chevron"
        variant="down"
        className="pui:hidden pui:shrink-0 pui:text-foreground pui:tablet:block"
      />
    </>
  ) : null

  return (
    <header data-slot="header" className={cn("pui:border-b pui:bg-background", className)}>
      {/* Mobile 320x77 and desktop 1200x103 share the bar: the source keeps a
          single row at both devices and only the identity collapses. */}
      <div className="pui:mx-auto pui:flex pui:min-h-19 pui:max-w-7xl pui:items-center pui:justify-between pui:gap-2 pui:px-6 pui:py-4 pui:tablet:min-h-(--pui-header-height) pui:tablet:gap-6">
        {product.href ? (
          <Link
            href={product.href}
            className="pui:flex pui:min-w-0 pui:flex-1 pui:items-center pui:gap-2 pui:rounded-sm pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
          >
            {productContent}
          </Link>
        ) : (
          <div className="pui:flex pui:min-w-0 pui:flex-1 pui:items-center pui:gap-2">
            {productContent}
          </div>
        )}
        <div className="pui:flex pui:shrink-0 pui:items-center pui:gap-2 pui:tablet:gap-6">
          {user ? (
            user.href ? (
              <Link
                href={user.href}
                className="pui:flex pui:min-w-0 pui:items-center pui:gap-2 pui:rounded-sm pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
              >
                {userContent}
              </Link>
            ) : (
              <div className="pui:flex pui:min-w-0 pui:items-center pui:gap-2">{userContent}</div>
            )
          ) : null}
          {actions}
        </div>
      </div>
    </header>
  )
}

export { Header, type HeaderProps }
