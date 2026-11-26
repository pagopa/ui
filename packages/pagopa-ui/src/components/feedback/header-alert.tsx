"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { X } from "@/components/primitives/icons"

import { toneStyles, type Tone } from "./tones"

type HeaderAlertTone = Tone | "default"

/**
 * Props of {@link HeaderAlert}. The full-width source band above the header.
 */
interface HeaderAlertProps {
  /** Copy of the band. */
  children: React.ReactNode
  /** Semantic tone; `default` is the neutral band without a status icon. @default "info" */
  tone?: HeaderAlertTone
  /** Optional action; the Default tone uses a compact link. */
  action?: React.ReactNode
  /** Shows the dismiss control when provided. */
  onDismiss?: () => void
  /** Accessible name of the dismiss control. @default messages.headerAlert.dismissLabel */
  dismissLabel?: string
}

// The source tone instances: the published PagoPA glyphs the pinned set draws —
// `1322:6542` (info, the filled variant `98:1115`), `7635:3910` (check_circle),
// `1322:6534` (warning) and `7635:3924` (report).
const toneIcons: Record<Tone, React.ReactElement> = {
  info: <PagoPAIcon name="info" variant="filled" size={24} className="pui:shrink-0" />,
  success: <PagoPAIcon name="check_circle" size={24} className="pui:shrink-0" />,
  warning: <PagoPAIcon name="warning" size={24} className="pui:shrink-0" />,
  error: <PagoPAIcon name="report" size={24} className="pui:shrink-0" />,
}

function HeaderAlert({
  children,
  tone = "info",
  action,
  onDismiss,
  dismissLabel: dismissLabelProp,
}: HeaderAlertProps) {
  const t = useMessages("headerAlert")
  const dismissLabel = dismissLabelProp ?? t.dismissLabel

  const isDefault = tone === "default"
  const toneIcon = isDefault ? undefined : toneIcons[tone]
  // The source's trailing control belongs to the Default tone; a caller-owned
  // action or dismiss keeps a tinted row left-growing like the Default one
  // instead of the source's centred icon+copy pair.
  const centred = !isDefault && !action && !onDismiss
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "pui:text-label-mini-sb",
        isDefault ? "pui:bg-selection-soft pui:text-foreground" : toneStyles[tone],
      )}
    >
      <div
        className={cn(
          "pui:mx-auto pui:flex pui:min-h-10 pui:max-w-7xl pui:items-center pui:px-6 pui:py-2",
          // The source root: 16 between its `Content` row and the trailing
          // button (Default), 8 between the icon and the copy (tinted).
          isDefault ? "pui:gap-4 pui:max-tablet:flex-col pui:max-tablet:items-start" : "pui:gap-2",
          centred && "pui:justify-center",
        )}
      >
        <div
          data-slot="header-alert-content"
          className={cn(
            "pui:flex pui:min-w-0 pui:items-center pui:gap-2",
            // Source `Status=Default` (`11014:7007`/`11014:7010`): the `Content`
            // row fills the band at every device; the tinted tones
            // (`1322:6534`, `align=CENTER`) centre the icon+copy pair, so their
            // row hugs from `sm` where the copy needs no wrapping.
            isDefault
              ? "pui:flex-1 pui:max-tablet:w-full"
              : centred
                ? "pui:w-full pui:tablet:w-auto"
                : "pui:flex-1",
          )}
        >
          {toneIcon ?? <PagoPAIcon name="kid_star" size={24} className="pui:shrink-0" />}
          <div className={cn("pui:min-w-0 pui:flex-1", centred && "pui:tablet:flex-initial")}>
            {children}
          </div>
        </div>
        {action && (
          <div data-slot="header-alert-action" className="pui:flex pui:shrink-0">
            {action}
          </div>
        )}
        {onDismiss && (
          <button
            type="button"
            aria-label={dismissLabel}
            onClick={onDismiss}
            className="pui:flex pui:size-10 pui:items-center pui:justify-center pui:rounded-md pui:focus-visible:outline-2 pui:focus-visible:outline-current"
          >
            <X aria-hidden="true" className="pui:size-5" />
          </button>
        )}
      </div>
    </div>
  )
}

export { HeaderAlert, type HeaderAlertProps, type HeaderAlertTone }
