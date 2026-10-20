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
      className={cn(
        "grid gap-0.5 py-4",
        indicatorPlacement === "end" && "gap-1",
        loading && description && "gap-2",
        className,
      )}
    >
      <label
        className={cn(
          "flex min-h-6 cursor-pointer items-start gap-2",
          unavailable && "cursor-not-allowed",
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
          className={cn(indicatorPlacement === "end" && "order-last")}
          {...props}
        />
        <span className="flex min-h-6 min-w-0 flex-1 items-center gap-2">
          {leadingIcon ? (
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center text-choice-icon"
            >
              {loading ? <Skeleton className="size-6 rounded" /> : leadingIcon}
            </span>
          ) : null}
          {loading ? (
            <Skeleton
              className={cn("h-4 max-w-full", leadingIcon || description ? "w-45" : "w-61")}
            />
          ) : null}
          <span
            className={cn(
              "min-w-0 text-label-sb",
              unavailable && "text-muted-foreground",
              loading && "sr-only",
            )}
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
      {description || error || success ? (
        <div className={cn("grid gap-0.5", indicatorPlacement === "start" ? "pl-8" : "gap-1")}>
          {loading && description ? (
            <>
              <p id={ids.descriptionId} className="sr-only">
                {description}
              </p>
              <span aria-hidden="true" className="grid gap-2.5">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-2 w-full" />
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
