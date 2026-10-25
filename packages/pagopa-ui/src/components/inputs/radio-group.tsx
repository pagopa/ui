"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

import { RadioGroup as RadioGroupPrimitive } from "@/components/primitives/radio-group"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds } from "./field-utils"

function RadioGroup({
  legend,
  description,
  error,
  required,
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive> & {
  legend: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
}) {
  const ids = useFieldIds()

  return (
    <fieldset
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
