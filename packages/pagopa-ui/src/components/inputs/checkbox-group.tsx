"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds } from "./field-utils"

export type CheckboxGroupProps = React.ComponentProps<"fieldset"> & {
  legend: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  /** Suffix of a required legend. @default messages.fieldLabel.requiredLabel */
  requiredLabel?: string
}

function CheckboxGroup({
  legend,
  description,
  error,
  required,
  requiredLabel: requiredLabelProp,
  className,
  children,
  ...props
}: CheckboxGroupProps) {
  const t = useMessages("fieldLabel")
  const requiredLabel = requiredLabelProp ?? t.requiredLabel
  const ids = useFieldIds()

  return (
    <fieldset
      data-slot="checkbox-group"
      aria-describedby={describedBy(ids, { description, error })}
      aria-invalid={Boolean(error) || undefined}
      className={cn("pui:grid pui:gap-3", className)}
      {...props}
    >
      <legend className="pui:text-label-sb">
        {legend}
        {required ? (
          <>
            <span aria-hidden="true" className="pui:ml-0.5 pui:text-destructive">
              *
            </span>
            <span className="pui:sr-only"> {requiredLabel}</span>
          </>
        ) : null}
      </legend>
      <FieldMessages ids={ids} description={description} error={error} />
      <div className="pui:grid pui:gap-1">{children}</div>
    </fieldset>
  )
}

export { CheckboxGroup }
