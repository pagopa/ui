"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { X } from "@/components/primitives/icons"

import { toneStyles, type Tone } from "./tones"

const statusIcons = {
  info: "info",
  success: "check_circle",
  warning: "warning",
  error: "report",
} as const

/** Props of {@link Snackbar}. */
interface SnackbarProps {
  /** Optional title of the message. */
  title?: React.ReactNode
  /** Message body; the snackbar's announcing role follows `tone`. */
  message: React.ReactNode
  /** Optional action of the message. */
  action?: React.ReactNode
  /** Optional slot below the message. */
  footer?: React.ReactNode
  /** Shows the dismiss control when provided. */
  onDismiss?: () => void
  /** Semantic tone; it drives the announcing role. @default "info" */
  tone?: Tone
  /** Accessible name of the dismiss control. @default messages.snackbar.dismissLabel */
  dismissLabel?: string
  /** ClassName applied to the snackbar surface. */
  className?: string
}

function Snackbar({
  title,
  message,
  action,
  footer,
  onDismiss,
  tone = "info",
  dismissLabel: dismissLabelProp,
  className,
}: SnackbarProps) {
  const t = useMessages("snackbar")
  const dismissLabel = dismissLabelProp ?? t.dismissLabel

  const hasFooter = footer != null

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-slot="snackbar"
      data-tone={tone}
      className={cn(
        "min-h-14 w-(--overlay-width) max-w-[calc(100vw-var(--page-gutter))] items-start rounded-lg border p-4 shadow-32",
        hasFooter
          ? cn(
              "grid gap-4",
              action && onDismiss
                ? "grid-cols-[minmax(0,1fr)_auto_auto]"
                : action || onDismiss
                  ? "grid-cols-[minmax(0,1fr)_auto]"
                  : "grid-cols-[minmax(0,1fr)]",
            )
          : "flex gap-4",
        toneStyles[tone],
        className,
      )}
    >
      <div
        data-slot="snackbar-content"
        className={cn(
          "flex min-w-0 flex-1 items-start gap-2",
          hasFooter && "col-start-1 row-start-1",
        )}
      >
        <span
          data-slot="snackbar-icon"
          className="grid size-6 shrink-0 place-items-center text-current"
        >
          <PagoPAIcon name={statusIcons[tone]} {...(tone === "info" ? { filled: true } : {})} />
        </span>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-y-1">
          {title != null && (
            <div data-slot="snackbar-title" className="min-w-0 text-body-sb">
              {title}
            </div>
          )}
          <div data-slot="snackbar-description" className="min-w-0 text-caption">
            {message}
          </div>
        </div>
      </div>
      {action && (
        <div
          data-slot="snackbar-action"
          className={cn("min-w-0 shrink-0 self-center", hasFooter && "col-start-2 row-start-1")}
        >
          {action}
        </div>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          data-slot="snackbar-dismiss"
          className={cn(
            "relative size-6 shrink-0 rounded-md text-foreground after:absolute after:-inset-2.5 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-current",
            hasFooter && (action ? "col-start-3" : "col-start-2"),
            hasFooter && "row-start-1",
          )}
        >
          <span data-slot="snackbar-close-icon" className="grid size-6 place-items-center">
            <X aria-hidden="true" className="size-5" />
          </span>
        </button>
      )}
      {hasFooter && (
        <div data-slot="snackbar-footer" className="col-span-full min-w-0">
          {footer}
        </div>
      )}
    </div>
  )
}

export { Snackbar, type SnackbarProps }
