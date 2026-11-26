import * as React from "react"

import { Building2 } from "@/components/primitives/icons"

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
    <BoxedModule title={name} description={fiscalCode} icon={<Building2 aria-hidden="true" />}>
      {children}
    </BoxedModule>
  )
}

export { OrganizationModule }
