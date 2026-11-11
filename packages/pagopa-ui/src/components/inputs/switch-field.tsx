"use client"

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

  const labelElement = (
    <label
      htmlFor={ids.controlId}
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-3 text-label-sb",
        !start && "row-start-1 col-start-1",
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
  )

  const switchElement = (
    <Switch
      id={ids.controlId}
      required={required}
      disabled={disabled}
      loading={loading}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={describedBy(ids, state, ariaDescribedBy)}
      className={cn(start ? "absolute left-0 top-0" : "row-start-1 col-start-2")}
      {...props}
    />
  )

  const messagesElement = hasMessages ? (
    <div className={cn("grid min-w-0", start ? "gap-0.5" : "row-start-2 col-span-2")}>
      <FieldMessages ids={ids} {...state} />
    </div>
  ) : null

  const learnMoreElement = learnMore ? (
    <Link
      href={learnMore.href}
      className={cn(
        "relative flex w-fit min-w-0 max-w-full items-center rounded-sm text-label-mini-sb text-primary underline underline-offset-2 after:absolute after:-inset-y-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
        start ? "mt-1.5" : "col-span-2 mt-1",
      )}
    >
      {learnMore.label}
    </Link>
  ) : null

  // Keep the 44px target out of the 42px source copy stack.
  return (
    <div
      data-availability={unavailable ? "no" : "yes"}
      className={cn("grid min-w-0 wrap-anywhere", !start && "py-4", className)}
    >
      {start ? (
        <div className="relative min-h-11 min-w-0">
          <div className="grid min-w-0 pl-14">
            {labelElement}
            {messagesElement}
            {learnMoreElement}
          </div>
          {switchElement}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
          {labelElement}
          {switchElement}
          {messagesElement}
          {learnMoreElement}
        </div>
      )}
    </div>
  )
}

export { SwitchField }
