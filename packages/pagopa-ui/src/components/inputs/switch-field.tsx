"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent, useMessages } from "@/lib/ui-provider"

import { Switch } from "@/components/primitives/switch"

import { FieldMessages } from "./field"
import { describedBy, useFieldIds, type ChoiceFieldProps } from "./field-utils"

export type SwitchFieldProps = Omit<React.ComponentProps<typeof Switch>, "id"> &
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
  }

function SwitchField({
  id,
  label,
  description,
  error,
  success,
  required,
  requiredLabel: requiredLabelProp,
  disabled,
  loading = false,
  leadingIcon,
  learnMore,
  indicatorPlacement = "end",
  unavailable = false,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SwitchFieldProps) {
  const Link = useLinkComponent()
  const t = useMessages("fieldLabel")
  const requiredLabel = requiredLabelProp ?? t.requiredLabel
  const ids = useFieldIds(id)
  const state = { description, error, success }
  const controlsDisabled = disabled || loading
  const hasMessages = Boolean(description || error || success)
  const start = indicatorPlacement === "start"

  const labelElement = (
    <label
      htmlFor={ids.controlId}
      className={cn(
        "pui:flex pui:min-w-0 pui:cursor-pointer pui:items-center pui:gap-3 pui:text-label-sb",
        !start && "pui:row-start-1 pui:col-start-1",
        (!start || !hasMessages) && "pui:min-h-11",
        controlsDisabled && "pui:cursor-not-allowed pui:text-muted-foreground",
      )}
    >
      {leadingIcon ? (
        <span
          aria-hidden="true"
          className={cn(
            "pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:text-choice-icon pui:[&>svg:not(.pagopa-icon)]:size-6",
            unavailable && "pui:opacity-50 pui:forced-colors:opacity-100",
          )}
        >
          {leadingIcon}
        </span>
      ) : null}
      <span className="pui:min-w-0 pui:wrap-anywhere">
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
      className={cn(
        start ? "pui:absolute pui:left-0 pui:top-0" : "pui:row-start-1 pui:col-start-2",
      )}
      {...props}
    />
  )

  const messagesElement = hasMessages ? (
    <div
      className={cn(
        "pui:grid pui:min-w-0",
        start ? "pui:gap-0.5" : "pui:row-start-2 pui:col-span-2",
      )}
    >
      <FieldMessages ids={ids} {...state} />
    </div>
  ) : null

  const learnMoreElement = learnMore ? (
    <Link
      href={learnMore.href}
      className={cn(
        "pui:relative pui:flex pui:w-fit pui:min-w-0 pui:max-w-full pui:items-center pui:rounded-sm pui:text-label-mini-sb pui:text-primary pui:underline pui:underline-offset-2 pui:after:absolute pui:after:-inset-y-3 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring",
        start ? "pui:mt-1.5" : "pui:col-span-2 pui:mt-1",
      )}
    >
      {learnMore.label}
    </Link>
  ) : null

  // Keep the 44px target out of the 42px source copy stack.
  return (
    <div
      data-slot="switch-field"
      data-availability={unavailable ? "no" : "yes"}
      className={cn("pui:grid pui:min-w-0 pui:wrap-anywhere", !start && "pui:py-4", className)}
    >
      {start ? (
        <div className="pui:relative pui:min-h-11 pui:min-w-0">
          <div className="pui:grid pui:min-w-0 pui:pl-14">
            {labelElement}
            {messagesElement}
            {learnMoreElement}
          </div>
          {switchElement}
        </div>
      ) : (
        <div className="pui:grid pui:min-w-0 pui:grid-cols-[minmax(0,1fr)_auto] pui:items-center pui:gap-x-3">
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
