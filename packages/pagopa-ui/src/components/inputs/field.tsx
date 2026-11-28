"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"
import { Default as ReportIcon } from "@/components/icons/generated/report"
import { useFieldIds, type FieldStateProps } from "./field-utils"

// The source label is a HUG container whose children are counter-axis centred
// (529:6095, 529:6270): a flex row with `items-center` reproduces the mixing of
// the 12/18 label with the 14/20 (floated) / 18/26 (resting) required marker.
// The label also owns the source notch: the white strip that masks the top
// border, inset 12px after the frame edge (44px after a leading icon) before
// the label's own 4px horizontal padding.
// The floated label is centred 1px below the frame's top edge in every source
// state (label text 12/18 at -8, marker 14/20 at -9), which `top-px` plus a
// percentage translate reproduces whatever the tallest child measures; the
// resting label keeps the same rule with `top-1/2` (and the textarea, whose
// source label sits at the frame's 12px inset, overrides it through
// `restingClassName`).
function FloatingFieldLabel({
  id,
  htmlFor,
  label,
  required,
  requiredLabel: requiredLabelProp,
  floated,
  leadingIcon,
  focusDriven = true,
  placeholderValue = true,
  restingClassName,
  className,
}: {
  id?: string
  htmlFor: string
  label: React.ReactNode
  required?: boolean
  /** Visible suffix of the required marker. @default messages.floatingFieldLabel.requiredLabel */
  requiredLabel?: string
  floated?: boolean
  leadingIcon?: React.ReactNode
  /** The CSS `:focus` state floats the label. */
  focusDriven?: boolean
  /** The CSS `:not(:placeholder-shown)` state floats the label (text entries). */
  placeholderValue?: boolean
  restingClassName?: string
  className?: string
}) {
  const t = useMessages("floatingFieldLabel")
  const requiredLabel = requiredLabelProp ?? t.requiredLabel

  const focusFloats = !floated && focusDriven
  const placeholderFloats = !floated && placeholderValue
  return (
    <label
      id={id}
      htmlFor={htmlFor}
      className={cn(
        // Bounded to the control (the right inset plus `w-fit`) so a long label
        // with the visible required suffix wraps instead of widening the page at
        // 200% text.
        "pui:pointer-events-none pui:absolute pui:left-3 pui:right-3 pui:inline-flex pui:w-fit pui:flex-wrap pui:items-center pui:bg-background pui:px-1 pui:text-muted-foreground pui:transition-all pui:duration-150 pui:peer-disabled:bg-muted pui:motion-reduce:transition-none",
        // Resting: the source 16/22 label with its 18/26 required marker and
        // the source 4px gap.
        "pui:gap-1 pui:text-label-sb pui:[&>span:first-of-type]:text-body-big-sb",
        !floated && cn("pui:top-1/2 pui:-translate-y-1/2", restingClassName),
        // Floated: the source 12/18 caption with its 14/20 marker, its 2px gap
        // and the notch centred on the 1px top border.
        floated &&
          "pui:top-px pui:-translate-y-1/2 pui:gap-0.5 pui:text-caption-sb pui:[&>span:first-of-type]:text-label-mini-sb",
        focusFloats &&
          "pui:peer-focus:top-px pui:peer-focus:-translate-y-1/2 pui:peer-focus:gap-0.5 pui:peer-focus:text-caption-sb pui:peer-focus:text-primary pui:peer-focus:[&>span:first-of-type]:text-label-mini-sb",
        placeholderFloats &&
          // Native pickers keep the label resting while empty because
          // `:placeholder-shown` never matches them, so their value state is
          // caller-driven through `floated` (`placeholderValue={false}`).
          "pui:peer-[:not(:placeholder-shown)]:top-px pui:peer-[:not(:placeholder-shown)]:-translate-y-1/2 pui:peer-[:not(:placeholder-shown)]:gap-0.5 pui:peer-[:not(:placeholder-shown)]:text-caption-sb pui:peer-[:not(:placeholder-shown)]:[&>span:first-of-type]:text-label-mini-sb",
        // The source rest label is inset 44px (24px icon frame + 8px gap + 12px
        // frame padding) and the floated notch 12px, both before the label's own
        // 4px padding: 529:6102, 602:9439, 824:8865.
        leadingIcon && cn(!floated && "pui:left-10", floated && "pui:left-3"),
        focusFloats && leadingIcon && "pui:peer-focus:left-3",
        placeholderFloats && leadingIcon && "pui:peer-[:not(:placeholder-shown)]:left-3",
        className,
      )}
    >
      {label}
      {required ? (
        <>
          <span aria-hidden="true" className="pui:text-destructive">
            *
          </span>
          {/* The rule asks for the state in words, not the asterisk alone. The
              suffix is a flex item (blockified), so the accessible-name
              computation separates it from the label text with a space; the
              group gap keeps the visual rhythm. */}
          <span className="pui:text-caption">{requiredLabel}</span>
        </>
      ) : null}
    </label>
  )
}

function FieldLabel({
  id,
  htmlFor,
  label,
  required,
  requiredLabel: requiredLabelProp,
  disabled,
  className,
}: FieldStateProps & { id?: string; htmlFor: string; className?: string }) {
  const t = useMessages("fieldLabel")
  const requiredLabel = requiredLabelProp ?? t.requiredLabel

  return (
    <label
      id={id}
      htmlFor={htmlFor}
      className={cn(
        "pui:w-fit pui:text-label-sb pui:wrap-anywhere",
        disabled && "pui:text-muted-foreground",
        className,
      )}
    >
      {label}
      {required ? (
        <>
          <span aria-hidden="true" className="pui:ml-0.5 pui:text-destructive">
            *
          </span>
          {/* Visible words next to the marker, as the field rule asks. The
              inline-block display separates it from the label text in the
              accessible-name computation; the margin keeps the visual gap. */}
          <span className="pui:ml-0.5 pui:inline-block pui:text-caption">{requiredLabel}</span>
        </>
      ) : null}
    </label>
  )
}

function FieldMessages({
  ids,
  description,
  error,
  success,
  errorIcon = true,
}: Pick<FieldStateProps, "description" | "error" | "success"> & {
  ids: ReturnType<typeof useFieldIds>
  errorIcon?: boolean
}) {
  return (
    <>
      {description ? (
        <p id={ids.descriptionId} className="pui:text-caption pui:text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p
          id={ids.errorId}
          data-slot="field-error"
          className={cn(
            "pui:text-caption pui:text-destructive",
            errorIcon && "pui:flex pui:items-start pui:gap-1.5",
          )}
        >
          {errorIcon ? <Icon source={ReportIcon} size={16} className="pui:mt-0.5" /> : null}
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p
          id={ids.successId}
          className="pui:flex pui:items-start pui:gap-1.5 pui:text-caption pui:text-success"
        >
          <Icon source={CheckCircleIcon} className="pui:mt-0.5 pui:size-4 pui:shrink-0" />
          {success}
        </p>
      ) : null}
    </>
  )
}

export { FieldLabel, FieldMessages, FloatingFieldLabel }
// oxlint-disable-next-line react/only-export-components -- compatibility exports; implementations live in field-utils.ts
export { describedBy, useFieldIds, type FieldStateProps } from "./field-utils"
