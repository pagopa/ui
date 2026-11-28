"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Checkbox, type CheckboxProps } from "@/components/primitives/checkbox"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds, type ChoiceFieldProps } from "./field-utils"

type CheckboxFieldProps = Omit<CheckboxProps, "id"> &
  ChoiceFieldProps & {
    /** Decorative icon (source rich option). */
    leadingIcon?: React.ReactNode
    /** Side of the indicator. @default "start" */
    indicatorPlacement?: "start" | "end"
  }

function CheckboxField({
  id,
  label,
  description,
  error,
  success,
  required,
  requiredLabel: requiredLabelProp,
  disabled,
  leadingIcon,
  indicatorPlacement = "start",
  checked,
  defaultChecked,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: CheckboxFieldProps) {
  const t = useMessages("fieldLabel")
  const requiredLabel = requiredLabelProp ?? t.requiredLabel
  const ids = useFieldIds(id)
  const state = { description, error, success }
  const hasMessages = Boolean(description || error || success)

  return (
    <div
      data-slot="checkbox-field"
      className={cn(
        "pui:grid pui:py-4",
        indicatorPlacement === "end" ? "pui:gap-1" : "pui:gap-0.5",
        className,
      )}
    >
      <label
        className={cn(
          "pui:flex pui:min-h-6 pui:cursor-pointer pui:items-start pui:gap-2",
          disabled && "pui:cursor-not-allowed",
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
          className={cn(indicatorPlacement === "end" && "pui:order-last")}
          {...props}
        />
        <span
          data-fidelity-part="copy"
          className="pui:flex pui:min-h-6 pui:min-w-0 pui:flex-1 pui:items-start pui:gap-2"
        >
          {leadingIcon ? (
            <span
              aria-hidden="true"
              className={cn(
                "pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:text-choice-icon pui:[&>svg:not(.pagopa-icon)]:size-6",
                disabled && "pui:opacity-50",
              )}
            >
              {leadingIcon}
            </span>
          ) : null}
          <span
            data-fidelity-part="label"
            className={cn("pui:pt-0.5 pui:text-label-sb", disabled && "pui:text-muted-foreground")}
          >
            {label}
            {required ? (
              <>
                <span aria-hidden="true" className="pui:ml-0.5 pui:text-destructive">
                  *
                </span>
                <span className="pui:sr-only"> {requiredLabel}</span>
              </>
            ) : null}
          </span>
        </span>
      </label>
      {hasMessages ? (
        <div
          className={cn(
            "pui:flex pui:flex-col pui:gap-1",
            indicatorPlacement === "end" ? "" : "pui:pl-8",
          )}
        >
          <FieldMessages ids={ids} {...state} />
        </div>
      ) : null}
    </div>
  )
}

export { CheckboxField }
export type { CheckboxFieldProps }
