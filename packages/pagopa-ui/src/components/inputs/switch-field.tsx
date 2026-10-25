import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent } from "@/lib/ui-provider"

import { Switch } from "@/components/primitives/switch"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds, type ChoiceFieldProps } from "./field-utils"

function SwitchField({
  id,
  label,
  description,
  error,
  success,
  required,
  disabled,
  loading = false,
  leadingIcon,
  learnMore,
  indicatorPlacement = "end",
  unavailable = false,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: Omit<React.ComponentProps<typeof Switch>, "id"> &
  ChoiceFieldProps & {
    /** Busy state: keeps the real selection and follows disabled submission. */
    loading?: boolean
    /** Decorative icon (source rich option). */
    leadingIcon?: React.ReactNode
    /** Optional supporting link. */
    learnMore?: { label: string; href: string }
    /** Side of the indicator. @default "end" */
    indicatorPlacement?: "start" | "end"
    /** Source "availability no" state: never affects the choice. */
    unavailable?: boolean
  }) {
  const Link = useLinkComponent()
  const ids = useFieldIds(id)
  const state = { description, error, success }
  const controlsDisabled = disabled || loading
  const hasMessages = Boolean(description || error || success)
  const start = indicatorPlacement === "start"

  return (
    <div
      data-availability={unavailable ? "no" : "yes"}
      className={cn("grid min-w-0 wrap-anywhere", !start && "py-4", className)}
    >
      <div
        className={cn(
          "grid min-w-0 items-center",
          start
            ? "grid-cols-[auto_minmax(0,1fr)] gap-x-0 gap-y-0.5"
            : "grid-cols-[minmax(0,1fr)_auto] gap-x-3",
        )}
      >
        <label
          htmlFor={ids.controlId}
          className={cn(
            "row-start-1 flex min-w-0 cursor-pointer items-center gap-3 text-label-sb",
            start ? "col-start-2" : "col-start-1",
            (!start || !hasMessages) && "min-h-11",
            controlsDisabled && "cursor-not-allowed text-muted-foreground",
          )}
        >
          {leadingIcon ? (
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center text-choice-icon [&>*]:size-6",
                unavailable && "opacity-50 forced-colors:opacity-100",
              )}
            >
              {leadingIcon}
            </span>
          ) : null}
          <span className="min-w-0 wrap-anywhere">
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
        </label>
        <Switch
          id={ids.controlId}
          required={required}
          disabled={disabled}
          loading={loading}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(ids, state, ariaDescribedBy)}
          className={cn(
            "row-start-1",
            start ? "col-start-1 self-start" : "col-start-2",
            start && hasMessages && "row-span-2",
          )}
          {...props}
        />
        {hasMessages ? (
          <div
            className={cn("row-start-2 grid min-w-0", start ? "col-start-2 gap-0.5" : "col-span-2")}
          >
            <FieldMessages ids={ids} {...state} />
          </div>
        ) : null}
        {learnMore ? (
          <Link
            href={learnMore.href}
            className={cn(
              "relative mt-1 flex w-fit min-w-0 max-w-full items-center rounded-sm text-label-mini-sb text-primary underline underline-offset-2 after:absolute after:-inset-y-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
              start ? "col-start-2" : "col-span-2",
            )}
          >
            {learnMore.label}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export { SwitchField }
