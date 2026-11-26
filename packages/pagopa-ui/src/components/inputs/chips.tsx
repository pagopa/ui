"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

type ChipVariant =
  | "default"
  | "error"
  | "highlight"
  | "informative"
  | "neutral"
  | "primary"
  | "success"
  | "warning"

type ChipAppearance = "solid" | "outline"

const chipStyles: Record<ChipVariant, Record<ChipAppearance, string>> = {
  default: {
    solid: "border-0 bg-chip-primary-soft text-chip-primary-foreground",
    outline: "border-chip-default-outline bg-transparent text-chip-default-outline",
  },
  error: {
    solid: "border-0 bg-error-soft text-error-foreground",
    outline: "border-destructive bg-transparent text-destructive",
  },
  highlight: {
    solid: "border-0 bg-chip-highlight-soft text-chip-highlight-foreground",
    outline: "border-chip-highlight-foreground bg-transparent text-chip-highlight-foreground",
  },
  informative: {
    solid: "border-0 bg-info-soft text-info-foreground",
    outline: "border-info-foreground bg-transparent text-info-foreground",
  },
  neutral: {
    solid: "border-0 bg-secondary text-secondary-foreground",
    outline: "border-foreground bg-transparent text-foreground",
  },
  primary: {
    solid: "border-primary bg-accent text-primary",
    outline: "border-primary bg-transparent text-primary",
  },
  success: {
    solid: "border-0 bg-success-soft text-success-foreground",
    outline: "border-success-foreground bg-transparent text-success-foreground",
  },
  warning: {
    solid: "border-0 bg-warning-soft text-warning-foreground",
    outline: "border-warning-foreground bg-transparent text-warning-foreground",
  },
}

function Chip({
  className,
  children,
  onRemove,
  removeLabel,
  variant = "default",
  appearance = "solid",
  size = "default",
  ...props
}: React.ComponentProps<"span"> & {
  /** Adds the source remove control; without it the chip is a static label. */
  onRemove?: () => void
  /** Accessible name of the remove control. @default messages.chip.removeLabel */
  removeLabel?: string
  /** Meaning of the chip. @default "default" */
  variant?: ChipVariant
  /** Surface treatment. @default "solid" */
  appearance?: ChipAppearance
  /** Size step of the chip. @default "default" */
  size?: "default" | "compact"
}) {
  const variantClassName =
    size === "compact" && variant === "primary" && appearance === "solid"
      ? "border-transparent bg-chip-primary-soft text-chip-primary-foreground"
      : chipStyles[variant][appearance]
  const t = useMessages("chip")
  const chipLabel = typeof children === "string" ? children : undefined

  return (
    <span
      data-variant={variant}
      data-appearance={appearance}
      data-size={size}
      className={cn(
        "pui:inline-flex pui:items-center pui:gap-2 pui:rounded-full pui:border pui:border-border pui:bg-muted pui:px-4",
        size === "compact"
          ? "pui:min-h-6 pui:px-2 pui:py-0.5 pui:text-caption-sb"
          : "pui:text-label-sb",
        variantClassName,
        onRemove && "pui:pr-1",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? t.removeLabel(chipLabel)}
          className="pui:relative pui:-my-0.5 pui:inline-grid pui:size-6 pui:shrink-0 pui:place-items-center pui:rounded-full pui:text-current pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:hover:bg-foreground/10 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring"
        >
          <PagoPAIcon name="close" className="pui:size-5" />
        </button>
      ) : null}
    </span>
  )
}

function InputChip({
  className,
  children,
  onRemove,
  removeLabel,
  pointerRemove = false,
  ...props
}: React.ComponentProps<"span"> & {
  /** Removes the chip; with `pointerRemove` it is the pointer-only control. */
  onRemove?: () => void
  /** Accessible name of the remove button. @default messages.chip.removeLabel */
  removeLabel?: string
  /**
   * Removes on pointer only, without a nested `<button>`: the control for
   * containers that are already a button (a select trigger). Assistive
   * technology keeps the option toggle; pointer users get the chip control.
   */
  pointerRemove?: boolean
}) {
  const label = typeof children === "string" ? children : undefined
  const t = useMessages("chip")
  const trailing = onRemove || pointerRemove
  const removeGlyph = <PagoPAIcon name="close" size={24} variant="small" />
  return (
    <span
      className={cn(
        "pui:inline-flex pui:h-6 pui:max-w-full pui:items-center pui:rounded-full pui:bg-secondary pui:text-caption-sb pui:text-foreground",
        className,
      )}
      {...props}
    >
      <span className={cn("pui:min-w-0 pui:truncate pui:pl-2", trailing ? "pui:pr-1" : "pui:pr-2")}>
        {children}
      </span>
      {onRemove && !pointerRemove ? (
        <button
          type="button"
          aria-label={removeLabel ?? t.removeLabel(label)}
          onClick={onRemove}
          className="pui:relative pui:grid pui:size-6 pui:shrink-0 pui:place-items-center pui:rounded-full pui:text-primary pui:after:absolute pui:after:-inset-2.5 pui:hover:bg-foreground/5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
        >
          {removeGlyph}
        </button>
      ) : trailing ? (
        <span
          data-slot="input-chip-remove"
          aria-hidden="true"
          // The trigger must not open (or take focus) when the pointer lands on
          // the chip control, and the release must not reach the trigger either.
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove?.()
          }}
          className="pui:grid pui:size-6 pui:shrink-0 pui:cursor-pointer pui:place-items-center pui:rounded-full pui:text-primary pui:hover:bg-foreground/5"
        >
          {removeGlyph}
        </span>
      ) : null}
    </span>
  )
}

export { Chip, InputChip }
