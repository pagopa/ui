"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import {
  RadioGroup as RadioGroupPrimitive,
  type RadioGroupProps as RadioGroupPrimitiveProps,
} from "@/components/primitives/radio-group"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds } from "./field-utils"

type RadioGroupFieldProps = RadioGroupPrimitiveProps & {
  legend: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  /** Suffix of a required legend. @default messages.fieldLabel.requiredLabel */
  requiredLabel?: string
}

function RadioGroup({
  legend,
  description,
  error,
  required,
  requiredLabel: requiredLabelProp,
  className,
  children,
  ...props
}: RadioGroupFieldProps) {
  const t = useMessages("fieldLabel")
  const requiredLabel = requiredLabelProp ?? t.requiredLabel
  const ids = useFieldIds()

  return (
    <fieldset
      data-slot="radio-group"
      className={cn("pui:grid pui:gap-3", className)}
      aria-describedby={describedBy(ids, { description, error })}
      aria-invalid={Boolean(error) || undefined}
    >
      <legend className="pui:text-label-sb">
        <span id={`${ids.controlId}-legend`}>{legend}</span>
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
      <RadioGroupPrimitive
        required={required}
        aria-labelledby={`${ids.controlId}-legend`}
        aria-invalid={Boolean(error) || undefined}
        {...props}
      >
        {children}
      </RadioGroupPrimitive>
    </fieldset>
  )
}

export { RadioGroup }
export type { RadioGroupFieldProps }
