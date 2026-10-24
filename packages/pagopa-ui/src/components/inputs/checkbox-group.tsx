"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds } from "./field-utils"

function CheckboxGroup({
  legend,
  description,
  error,
  required,
  className,
  children,
  ...props
}: React.ComponentProps<"fieldset"> & {
  legend: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
}) {
  const ids = useFieldIds()

  return (
    <fieldset
      aria-describedby={describedBy(ids, { description, error })}
      aria-invalid={Boolean(error) || undefined}
      className={cn("grid gap-3", className)}
      {...props}
    >
      <legend className="text-label-sb">
        {legend}
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
      <div className="grid gap-1">{children}</div>
    </fieldset>
  )
}

export { CheckboxGroup }
