"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

import { FieldMessages } from "./field"
import { useFieldIds } from "./field-utils"

export type SwitchGroupProps = React.ComponentProps<"fieldset"> & {
  legend: React.ReactNode
  description?: React.ReactNode
}

function SwitchGroup({ legend, description, className, children, ...props }: SwitchGroupProps) {
  const ids = useFieldIds()

  return (
    <fieldset
      data-slot="switch-group"
      aria-describedby={description ? ids.descriptionId : undefined}
      className={cn("grid gap-3", className)}
      {...props}
    >
      <legend className="text-label-sb">{legend}</legend>
      <FieldMessages ids={ids} description={description} />
      <div className="grid divide-y divide-border">{children}</div>
    </fieldset>
  )
}

export { SwitchGroup }
