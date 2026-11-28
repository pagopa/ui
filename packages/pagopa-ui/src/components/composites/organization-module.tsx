import * as React from "react"

import { Icon } from "@/components/icons/icon"
import { Default as AccountBalanceIcon } from "@/components/icons/generated/account-balance"

import { BoxedModule } from "./boxed-module"

export interface OrganizationModuleProps extends Omit<React.ComponentProps<"section">, "children"> {
  /** Organisation name; also the module title. */
  name: string
  /** Optional tax code. */
  fiscalCode?: string
  /** Optional module body. */
  children?: React.ReactNode
}

function OrganizationModule({
  name,
  fiscalCode,
  children,
  ref,
  ...props
}: OrganizationModuleProps) {
  return (
    <BoxedModule
      ref={ref}
      data-slot="organization-module"
      title={name}
      description={fiscalCode}
      icon={<Icon source={AccountBalanceIcon} />}
      {...props}
    >
      {children}
    </BoxedModule>
  )
}

export { OrganizationModule }
