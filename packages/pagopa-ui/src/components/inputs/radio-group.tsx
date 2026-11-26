"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

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
}

function RadioGroup({
  legend,
  description,
  error,
  required,
  className,
  children,
  ...props
}: RadioGroupFieldProps) {
  const ids = useFieldIds()

  return (
    <fieldset
      data-slot="radio-group-field"
      className={cn("grid gap-3", className)}
      aria-describedby={describedBy(ids, { description, error })}
      aria-invalid={Boolean(error) || undefined}
    >
      <legend className="text-label-sb">
        <span id={`${ids.controlId}-legend`}>{legend}</span>
        {required ? (
          <>
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
            <span className="sr-only"> (obbligatorio)</span>
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
