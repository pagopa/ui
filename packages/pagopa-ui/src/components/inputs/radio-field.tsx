"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

import { RadioGroupItem } from "@/components/primitives/radio-group"
import { Skeleton } from "@/components/primitives/skeleton"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds, type ChoiceFieldProps } from "./field-utils"

function RadioField({
  id,
  value,
  label,
  description,
  error,
  success,
  required,
  disabled,
  leadingIcon,
  indicatorPlacement = "start",
  loading = false,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: React.ComponentProps<typeof RadioGroupItem> &
  ChoiceFieldProps & {
    /** Decorative icon (source rich option). */
    leadingIcon?: React.ReactNode
    /** Side of the indicator. @default "start" */
    indicatorPlacement?: "start" | "end"
    /** Busy state: keeps the real selection, announces it and shows placeholders. */
    loading?: boolean
  }) {
  const ids = useFieldIds(id)
  const state = { description, error, success }
  const unavailable = disabled || loading

  return (
    <div
      data-slot="radio-field"
      className={cn(
        "pui:grid pui:gap-0.5 pui:py-4",
        indicatorPlacement === "end" && "pui:gap-1",
        loading && description && "pui:gap-2",
        className,
      )}
    >
      <label
        className={cn(
          "pui:flex pui:min-h-6 pui:cursor-pointer pui:items-start pui:gap-2",
          unavailable && "pui:cursor-not-allowed",
        )}
      >
        <RadioGroupItem
          id={ids.controlId}
          value={value}
          required={required}
          disabled={unavailable}
          aria-busy={loading || undefined}
          aria-invalid={Boolean(error) || ariaInvalid || undefined}
          aria-describedby={describedBy(ids, state, ariaDescribedBy)}
          className={cn(indicatorPlacement === "end" && "pui:order-last")}
          {...props}
        />
        <span className="pui:flex pui:min-h-6 pui:min-w-0 pui:flex-1 pui:items-center pui:gap-2">
          {leadingIcon ? (
            <span
              aria-hidden="true"
              className="pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:text-choice-icon"
            >
              {loading ? <Skeleton className="pui:size-6 pui:rounded" /> : leadingIcon}
            </span>
          ) : null}
          {loading ? (
            <Skeleton
              className={cn(
                "pui:h-4 pui:max-w-full pui:rounded-lg",
                leadingIcon || description ? "pui:w-45" : "pui:w-61",
              )}
            />
          ) : null}
          <span
            className={cn(
              "pui:min-w-0 pui:text-label-sb",
              unavailable && "pui:text-muted-foreground",
              loading && "pui:sr-only",
            )}
          >
            {label}
            {required ? (
              <>
                <span aria-hidden="true" className="pui:ml-0.5 pui:text-destructive">
                  *
                </span>
                <span className="pui:sr-only"> (obbligatorio)</span>
              </>
            ) : null}
          </span>
        </span>
      </label>
      {description || error || success ? (
        <div
          className={cn(
            "pui:grid pui:gap-0.5",
            indicatorPlacement === "start" ? "pui:pl-8" : "pui:gap-1",
          )}
        >
          {loading && description ? (
            <>
              <p id={ids.descriptionId} className="pui:sr-only">
                {description}
              </p>
              <span aria-hidden="true" className="pui:grid pui:gap-2.5">
                <Skeleton className="pui:h-2 pui:w-full pui:rounded-lg" />
                <Skeleton className="pui:h-2 pui:w-full pui:rounded-lg" />
                <Skeleton className="pui:h-2 pui:w-full pui:rounded-lg" />
              </span>
            </>
          ) : null}
          <FieldMessages
            ids={ids}
            description={loading ? undefined : description}
            error={error}
            success={success}
          />
        </div>
      ) : null}
    </div>
  )
}

export { RadioField }
