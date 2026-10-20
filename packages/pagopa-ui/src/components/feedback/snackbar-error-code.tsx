import * as React from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { Snackbar } from "./snackbar"

function SnackbarErrorCode({
  message = "Si è verificato un errore",
  description,
  code,
  onDismiss,
  copyLabel = "Copia codice",
  copiedLabel = "Codice copiato",
  copyErrorLabel = "Impossibile copiare il codice. Copialo manualmente.",
}: {
  message?: React.ReactNode
  description?: React.ReactNode
  code: string
  onDismiss?: () => void
  /** Accessible name of the copy control. @default "Copia codice" */
  copyLabel?: string
  /** Announced text once the code is in the clipboard. @default "Codice copiato" */
  copiedLabel?: string
  /** Announced text when the clipboard write fails. @default "Impossibile copiare il codice. Copialo manualmente." */
  copyErrorLabel?: string
}) {
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
            className="flex min-h-12 items-center gap-3 rounded-lg border border-input bg-background px-3"
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
              className="grid size-11 shrink-0 place-items-center rounded-md text-primary focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
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
