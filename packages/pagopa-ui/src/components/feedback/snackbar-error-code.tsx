"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"
import { Icon } from "@/components/icons/icon"
import { Default as ContentCopyIcon } from "@/components/icons/generated/content-copy"

import { Snackbar } from "./snackbar"

export interface SnackbarErrorCodeProps {
  /** Visible error message. @default messages.snackbarErrorCode.message */
  message?: React.ReactNode
  description?: React.ReactNode
  code: string
  onDismiss?: () => void
  /** Accessible name of the copy control. @default messages.snackbarErrorCode.copyLabel */
  copyLabel?: string
  /** Announced text once the code is in the clipboard. @default messages.snackbarErrorCode.copiedLabel */
  copiedLabel?: string
  /** Announced text when the clipboard write fails. @default messages.snackbarErrorCode.copyErrorLabel */
  copyErrorLabel?: string
}

function SnackbarErrorCode({
  message: messageProp,
  description,
  code,
  onDismiss,
  copyLabel: copyLabelProp,
  copiedLabel: copiedLabelProp,
  copyErrorLabel: copyErrorLabelProp,
}: SnackbarErrorCodeProps) {
  const t = useMessages("snackbarErrorCode")
  const message = messageProp ?? t.message
  const copyLabel = copyLabelProp ?? t.copyLabel
  const copiedLabel = copiedLabelProp ?? t.copiedLabel
  const copyErrorLabel = copyErrorLabelProp ?? t.copyErrorLabel

  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle")

  async function copyCode() {
    setCopyState("idle")
    if (!navigator.clipboard?.writeText) {
      setCopyState("failed")
      return
    }
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      setCopyState("failed")
      return
    }
    setCopyState("copied")
  }

  return (
    <Snackbar
      tone="error"
      onDismiss={onDismiss}
      title={message}
      message={description ?? null}
      footer={
        <div className="pui:grid pui:gap-2">
          <div
            data-slot="snackbar-error-code-field"
            className="pui:flex pui:h-12 pui:items-start pui:gap-3 pui:rounded-lg pui:border pui:border-input pui:bg-background pui:px-3 pui:pt-3"
          >
            <span
              data-slot="snackbar-error-code-value"
              className="pui:min-w-0 pui:flex-1 pui:font-mono pui:text-foreground pui:text-mono pui:wrap-anywhere"
            >
              {code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              aria-label={copyLabel}
              data-slot="snackbar-error-code-copy"
              className="pui:relative pui:grid pui:size-6 pui:shrink-0 pui:place-items-center pui:rounded-md pui:p-0 pui:text-primary pui:after:absolute pui:after:-inset-2.5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
            >
              <Icon source={ContentCopyIcon} />
            </button>
          </div>
          <output aria-live="polite" className="pui:sr-only">
            {copyState === "copied" ? copiedLabel : ""}
          </output>
          {copyState === "failed" ? (
            <span role="alert" className="pui:text-label-mini">
              {copyErrorLabel}
            </span>
          ) : null}
        </div>
      }
    />
  )
}

export { SnackbarErrorCode }
