import * as React from "react"

export interface NavItem {
  label: string
  href: string
  current?: boolean
  icon?: React.ReactNode
  badge?: React.ReactNode
  children?: NavItem[]
}
