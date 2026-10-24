"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

import { Checkbox } from "@/components/primitives/checkbox"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds, type ChoiceFieldProps } from "./field-utils"

function CheckboxField({
  id,
  label,
  description,
  error,
  success,
  required,
  disabled,
  leadingIcon,
  indicatorPlacement = "start",
  checked,
  defaultChecked,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: Omit<React.ComponentProps<typeof Checkbox>, "id"> &
  ChoiceFieldProps & {
    /** Decorative icon (source rich option). */
    leadingIcon?: React.ReactNode
    /** Side of the indicator. @default "start" */
    indicatorPlacement?: "start" | "end"
  }) {
  const ids = useFieldIds(id)
  const state = { description, error, success }
  const hasMessages = Boolean(description || error || success)

  return (
    <div
      data-slot="checkbox-field"
      className={cn("grid py-4", indicatorPlacement === "end" ? "gap-1" : "gap-0.5", className)}
    >
      <label
        className={cn(
          "flex min-h-6 cursor-pointer items-start gap-2",
          disabled && "cursor-not-allowed",
        )}
      >
        <Checkbox
          id={ids.controlId}
          required={required}
          disabled={disabled}
          checked={checked}
          defaultChecked={defaultChecked}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(ids, state, ariaDescribedBy)}
          className={cn(indicatorPlacement === "end" && "order-last")}
          {...props}
        />
        <span data-fidelity-part="copy" className="flex min-h-6 min-w-0 flex-1 items-start gap-2">
          {leadingIcon ? (
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center text-choice-icon [&>svg]:size-6",
                disabled && "opacity-50",
              )}
            >
              {leadingIcon}
            </span>
          ) : null}
          <span
            data-fidelity-part="label"
            className={cn("pt-0.5 text-label-sb", disabled && "text-muted-foreground")}
          >
            {label}
            {required ? (
              <>
                <span aria-hidden="true" className="ml-0.5 text-destructive">
                  *
                </span>
                <span className="sr-only"> (obbligatorio)</span>
              </>
            ) : null}
          </span>
        </span>
      </label>
      {hasMessages ? (
        <div className={cn("flex flex-col gap-1", indicatorPlacement === "end" ? "" : "pl-8")}>
          <FieldMessages ids={ids} {...state} />
        </div>
      ) : null}
    </div>
  )
}

export { CheckboxField }
