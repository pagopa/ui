import * as React from "react"

import { Icon } from "@/components/icons/icon"
import { Default as AccountBalanceIcon } from "@/components/icons/generated/account-balance"

import { BoxedModule } from "./boxed-module"

export interface OrganizationModuleProps {
  /** Organisation name; also the module title. */
  name: string
  /** Optional tax code. */
  fiscalCode?: string
  /** Optional module body. */
  children?: React.ReactNode
}

function OrganizationModule({ name, fiscalCode, children }: OrganizationModuleProps) {
  return (
    <BoxedModule title={name} description={fiscalCode} icon={<Icon source={AccountBalanceIcon} />}>
      {children}
    </BoxedModule>
  )
}

export { OrganizationModule }
