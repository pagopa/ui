import * as React from "react"

export interface NavItem {
  label: string
  href: string
  current?: boolean
  icon?: React.ReactNode
  /** Caller-owned badge node. Use `badgeCount` for the source numeric badge. */
  badge?: React.ReactNode
  /** Numeric notification count; the condensed rail renders it as a dot. */
  badgeCount?: number
  /** Accessible text of the numeric notification, for example "2 notifiche". */
  badgeLabel?: string
  /** Status chip; it hides in the condensed rail and returns in the overlay. */
  chip?: React.ReactNode
  children?: NavItem[]
}
