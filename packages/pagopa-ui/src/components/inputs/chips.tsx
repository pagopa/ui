"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { X } from "@/components/primitives/icons"
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
  /** Accessible name of the remove control; defaults to `Elimina {label}`. */
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

  return (
    <span
      data-variant={variant}
      data-appearance={appearance}
      data-size={size}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4",
        size === "compact" ? "min-h-6 px-2 py-0.5 text-caption-sb" : "text-label-sb",
        variantClassName,
        onRemove && "pr-1",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={
            removeLabel ?? (typeof children === "string" ? `Elimina ${children}` : "Elimina")
          }
          className="relative -my-0.5 inline-grid size-6 shrink-0 place-items-center rounded-full text-current outline-none after:absolute after:-inset-2.5 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <X aria-hidden="true" className="size-5" />
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
  /** Accessible name of the remove button; defaults to `Elimina {label}`. */
  removeLabel?: string
  /**
   * Removes on pointer only, without a nested `<button>`: the control for
   * containers that are already a button (a select trigger). Assistive
   * technology keeps the option toggle; pointer users get the chip control.
   */
  pointerRemove?: boolean
}) {
  const label = typeof children === "string" ? children : undefined
  const trailing = onRemove || pointerRemove
  const removeGlyph = <PagoPAIcon name="close" size={24} variant="small" />
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center rounded-full bg-secondary text-caption-sb text-foreground",
        className,
      )}
      {...props}
    >
      <span className={cn("min-w-0 truncate pl-2", trailing ? "pr-1" : "pr-2")}>{children}</span>
      {onRemove && !pointerRemove ? (
        <button
          type="button"
          aria-label={removeLabel ?? (label ? `Elimina ${label}` : "Elimina")}
          onClick={onRemove}
          className="relative grid size-6 shrink-0 place-items-center rounded-full text-primary after:absolute after:-inset-2.5 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-primary hover:bg-foreground/5"
        >
          {removeGlyph}
        </span>
      ) : null}
    </span>
  )
}

export { Chip, InputChip }
