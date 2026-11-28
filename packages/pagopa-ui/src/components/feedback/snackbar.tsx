"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Default as CloseIcon } from "@/components/icons/generated/close"

import { statusIcons, toneStyles, type Tone } from "./tones"

/** Props of {@link Snackbar}. */
interface SnackbarProps extends Omit<React.ComponentProps<"div">, "children" | "title"> {
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
  ref,
  ...props
}: SnackbarProps) {
  const t = useMessages("snackbar")
  const dismissLabel = dismissLabelProp ?? t.dismissLabel
  const ToneIcon = statusIcons[tone]

  const hasFooter = footer != null

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-slot="snackbar"
      data-tone={tone}
      ref={ref}
      {...props}
      className={cn(
        "pui:min-h-14 pui:w-(--pui-overlay-width) pui:max-w-[calc(100vw-var(--pui-page-gutter))] pui:items-start pui:rounded-lg pui:border pui:p-4 pui:shadow-32",
        hasFooter
          ? cn(
              "pui:grid pui:gap-4",
              action && onDismiss
                ? "pui:grid-cols-[minmax(0,1fr)_auto_auto]"
                : action || onDismiss
                  ? "pui:grid-cols-[minmax(0,1fr)_auto]"
                  : "pui:grid-cols-[minmax(0,1fr)]",
            )
          : "pui:flex pui:gap-4",
        toneStyles[tone],
        className,
      )}
    >
      <div
        data-slot="snackbar-content"
        className={cn(
          "pui:flex pui:min-w-0 pui:flex-1 pui:items-start pui:gap-2",
          hasFooter && "pui:col-start-1 pui:row-start-1",
        )}
      >
        <span
          data-slot="snackbar-icon"
          className="pui:grid pui:size-6 pui:shrink-0 pui:place-items-center pui:text-current"
        >
          <ToneIcon />
        </span>
        <div className="pui:grid pui:min-w-0 pui:flex-1 pui:grid-cols-1 pui:gap-y-1">
          {title != null && (
            <div data-slot="snackbar-title" className="pui:min-w-0 pui:text-body-sb">
              {title}
            </div>
          )}
          <div data-slot="snackbar-description" className="pui:min-w-0 pui:text-caption">
            {message}
          </div>
        </div>
      </div>
      {action && (
        <div
          data-slot="snackbar-action"
          className={cn(
            "pui:min-w-0 pui:shrink-0 pui:self-center",
            hasFooter && "pui:col-start-2 pui:row-start-1",
          )}
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
            "pui:relative pui:size-6 pui:shrink-0 pui:rounded-md pui:text-foreground pui:after:absolute pui:after:-inset-2.5 pui:hover:bg-foreground/5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-current",
            hasFooter && (action ? "pui:col-start-3" : "pui:col-start-2"),
            hasFooter && "pui:row-start-1",
          )}
        >
          <span
            data-slot="snackbar-close-icon"
            className="pui:grid pui:size-6 pui:place-items-center"
          >
            <CloseIcon className="pui:size-5" />
          </span>
        </button>
      )}
      {hasFooter && (
        <div data-slot="snackbar-footer" className="pui:col-span-full pui:min-w-0">
          {footer}
        </div>
      )}
    </div>
  )
}

export { Snackbar, type SnackbarProps }
