"use client"

import * as React from "react"

import { statusIcons, toneStyles, type Tone } from "@/components/feedback/tones"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
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
      className={cn("pui:w-full", className)}
    >
      <div
        aria-hidden="true"
        data-slot="popper-pointer-track"
        className={cn("pui:relative pui:z-10 pui:flex pui:h-5", pointerAlignment[pointer])}
      >
        <div data-slot="popper-pointer" className="pui:relative pui:h-5 pui:w-6 pui:pt-1">
          <svg
            viewBox="0 0 24 16"
            className={cn(
              "pui:h-4 pui:w-6 pui:forced-colors:fill-[Canvas] pui:forced-colors:stroke-[CanvasText]",
              pointerColors[tone],
            )}
          >
            <path d="M.5 16 9.5 2.5a3 3 0 0 1 5 0L23.5 16" strokeWidth="1" />
          </svg>
          <span
            className={cn(
              "pui:absolute pui:inset-x-px pui:-bottom-px pui:z-10 pui:h-px",
              toneStyles[tone],
            )}
          />
        </div>
      </div>
      <div
        data-slot="popper-card"
        className={cn(
          "pui:flex pui:w-full pui:items-start pui:gap-2 pui:rounded-lg pui:p-4 pui:shadow-32 pui:ring-1 pui:ring-inset pui:forced-colors:shadow-none pui:forced-colors:outline-1 pui:forced-colors:outline-solid pui:forced-colors:outline-[CanvasText]",
          toneStyles[tone],
          ringColors[tone],
        )}
      >
        <span
          data-slot="popper-icon"
          className="pui:grid pui:size-6 pui:shrink-0 pui:place-items-center"
        >
          <PagoPAIcon name={statusIcons[tone]} {...(tone === "info" ? { filled: true } : {})} />
        </span>
        <div
          id={id}
          data-slot="popper-message"
          className="pui:min-w-0 pui:flex-1 pui:break-words pui:text-body"
        >
          {children}
        </div>
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          data-slot="popper-dismiss"
          className="pui:relative pui:grid pui:size-6 pui:shrink-0 pui:place-items-center pui:rounded-md pui:text-foreground pui:after:absolute pui:after:-inset-2.5 pui:hover:bg-foreground/5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-current"
        >
          <PagoPAIcon name="close" className="pui:size-5" />
        </button>
      </div>
    </div>
  )
}

export { Popper, type PopperPointer, type PopperProps }
