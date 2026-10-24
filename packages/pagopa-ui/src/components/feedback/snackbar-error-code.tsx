"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { Snackbar } from "./snackbar"

function SnackbarErrorCode({
  message: messageProp,
  description,
  code,
  onDismiss,
  copyLabel: copyLabelProp,
  copiedLabel: copiedLabelProp,
  copyErrorLabel: copyErrorLabelProp,
}: {
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
}) {
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
        <div className="grid gap-2">
          <div
            data-slot="snackbar-error-code-field"
            className="flex h-12 items-start gap-3 rounded-lg border border-input bg-background px-3 pt-3"
          >
            <span
              data-slot="snackbar-error-code-value"
              className="min-w-0 flex-1 font-mono text-foreground text-mono wrap-anywhere"
            >
              {code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              aria-label={copyLabel}
              data-slot="snackbar-error-code-copy"
              className="relative grid size-6 shrink-0 place-items-center rounded-md p-0 text-primary after:absolute after:-inset-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <PagoPAIcon name="content_copy" />
            </button>
          </div>
          <output aria-live="polite" className="sr-only">
            {copyState === "copied" ? copiedLabel : ""}
          </output>
          {copyState === "failed" ? (
            <span role="alert" className="text-label-mini">
              {copyErrorLabel}
            </span>
          ) : null}
        </div>
      }
    />
  )
}

export { SnackbarErrorCode }
