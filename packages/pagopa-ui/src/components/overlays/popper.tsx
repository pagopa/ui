"use client"

import * as React from "react"

import { statusIcons, toneStyles, type Tone } from "@/components/feedback/tones"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { X } from "@/components/primitives/icons"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

type PopperPointer = "left" | "center" | "right"

/** Props of {@link Popper}. The caller owns its placement and visibility. */
interface PopperProps {
  /** ID referenced by the related field's `aria-describedby`. */
  id: string
  /** Message associated with the field. */
  children: React.ReactNode
  /** Dismisses the message; return focus to the field when the close button had focus. */
  onDismiss: () => void
  /** Semantic status of the message. @default "error" */
  tone?: Tone
  /** Horizontal position of the pointer. @default "center" */
  pointer?: PopperPointer
  /** Accessible name of the close button. @default messages.popper.dismissLabel */
  dismissLabel?: string
  /** Placement and width of the message surface. */
  className?: string
}

const pointerColors: Record<Tone, string> = {
  info: "fill-info-soft stroke-info-border",
  success: "fill-success-soft stroke-success-border",
  warning: "fill-warning-soft stroke-warning-border",
  error: "fill-error-soft stroke-error-border",
}

const ringColors: Record<Tone, string> = {
  info: "ring-info-border",
  success: "ring-success-border",
  warning: "ring-warning-border",
  error: "ring-error-border",
}

const pointerAlignment: Record<PopperPointer, string> = {
  left: "justify-start pl-6",
  center: "justify-center",
  right: "justify-end pr-6",
}

function Popper({
  id,
  children,
  onDismiss,
  tone = "error",
  pointer = "center",
  dismissLabel: dismissLabelProp,
  className,
}: PopperProps) {
  const t = useMessages("popper")
  const dismissLabel = dismissLabelProp ?? t.dismissLabel

  return (
    <div
      data-slot="popper"
      data-tone={tone}
      data-pointer={pointer}
      className={cn("w-full", className)}
    >
      <div
        aria-hidden="true"
        data-slot="popper-pointer-track"
        className={cn("relative z-10 flex h-5", pointerAlignment[pointer])}
      >
        <div data-slot="popper-pointer" className="relative h-5 w-6 pt-1">
          <svg
            viewBox="0 0 24 16"
            className={cn(
              "h-4 w-6 forced-colors:fill-[Canvas] forced-colors:stroke-[CanvasText]",
              pointerColors[tone],
            )}
          >
            <path d="M.5 16 9.5 2.5a3 3 0 0 1 5 0L23.5 16" strokeWidth="1" />
          </svg>
          <span className={cn("absolute inset-x-px -bottom-px z-10 h-px", toneStyles[tone])} />
        </div>
      </div>
      <div
        data-slot="popper-card"
        className={cn(
          "flex w-full items-start gap-2 rounded-lg p-4 shadow-32 ring-1 ring-inset forced-colors:shadow-none forced-colors:outline-1 forced-colors:outline-solid forced-colors:outline-[CanvasText]",
          toneStyles[tone],
          ringColors[tone],
        )}
      >
        <span data-slot="popper-icon" className="grid size-6 shrink-0 place-items-center">
          <PagoPAIcon name={statusIcons[tone]} {...(tone === "info" ? { filled: true } : {})} />
        </span>
        <div id={id} data-slot="popper-message" className="min-w-0 flex-1 break-words text-body">
          {children}
        </div>
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          data-slot="popper-dismiss"
          className="relative grid size-6 shrink-0 place-items-center rounded-md text-foreground after:absolute after:-inset-2.5 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  )
}

export { Popper, type PopperPointer, type PopperProps }
