"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

import { FieldMessages } from "./field"
import { useFieldIds } from "./field-utils"

function SwitchGroup({
  legend,
  description,
  className,
  children,
  ...props
}: React.ComponentProps<"fieldset"> & {
  legend: React.ReactNode
  description?: React.ReactNode
}) {
  const ids = useFieldIds()

  return (
    <fieldset
      data-slot="switch-group"
      aria-describedby={description ? ids.descriptionId : undefined}
      className={cn("pui:grid pui:gap-3", className)}
      {...props}
    >
      <legend className="pui:text-label-sb">{legend}</legend>
      <FieldMessages ids={ids} description={description} />
      <div className="pui:grid pui:divide-y pui:divide-border">{children}</div>
    </fieldset>
  )
}

export { SwitchGroup }
