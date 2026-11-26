import * as React from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { BoxedModule } from "./boxed-module"

function OrganizationModule({
  name,
  fiscalCode,
  children,
}: {
  /** Organisation name; also the module title. */
  name: string
  /** Optional tax code. */
  fiscalCode?: string
  /** Optional module body. */
  children?: React.ReactNode
}) {
  return (
    <BoxedModule title={name} description={fiscalCode} icon={<PagoPAIcon name="account_balance" />}>
      {children}
    </BoxedModule>
  )
}

export { OrganizationModule }
