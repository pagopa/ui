import * as React from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { cn } from "@/lib/cn"

import { StatePanel, type StateProps } from "./state-panel"

function KOState({
  code,
  codeLabel = "Codice errore",
  copyLabel = (label) => `Copia ${label.toLowerCase()}`,
  copiedLabel = "Codice copiato",
  copyErrorLabel = "Impossibile copiare il codice. Copialo manualmente.",
  onCopy,
  className,
  ...props
}: Omit<StateProps, "extra"> & {
  /** Error code of the state, shown in a copyable row. */
  code?: string
  /** Label of the code row; drives the copy button's accessible name. @default "Codice errore" */
  codeLabel?: string
  /** Complete accessible name of the copy control, from the row label. @default built-in Italian "Copia {label}" */
  copyLabel?: (codeLabel: string) => string
  /** Announced text once the code is in the clipboard. @default "Codice copiato" */
  copiedLabel?: string
  /** Announced text when the clipboard write fails. @default "Impossibile copiare il codice. Copialo manualmente." */
  copyErrorLabel?: string
  /** Called only after a successful clipboard write. */
  onCopy?: () => void
}) {
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle")

  async function copyCode() {
    setCopyState("idle")
    if (!code || !navigator.clipboard?.writeText) {
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
    onCopy?.()
  }

  return (
    <StatePanel
      {...props}
      actionsClassName="mx-auto w-full max-w-(--state-width) flex-col flex-nowrap items-center gap-6"
      className={cn("w-full max-w-none", className)}
      contentClassName="w-full max-w-none md:max-w-(--state-width)"
      extra={
        code ? (
          <div
            data-slot="ko-error-code-field"
            className="flex min-h-12 w-full max-w-(--state-width) items-center gap-3 rounded-lg border border-border bg-background px-3 text-left"
          >
            <span
              data-slot="ko-error-code-value"
              className="min-w-0 flex-1 font-mono text-foreground text-mono wrap-anywhere"
            >
              {code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              aria-label={copyLabel(codeLabel)}
              data-slot="ko-error-code-copy"
              className="grid size-11 shrink-0 place-items-center rounded-md text-primary focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <PagoPAIcon name="content_copy" />
            </button>
            <output aria-live="polite" className="sr-only">
              {copyState === "copied" ? copiedLabel : ""}
            </output>
            {copyState === "failed" ? (
              <span role="alert" className="sr-only">
                {copyErrorLabel}
              </span>
            ) : null}
          </div>
        ) : undefined
      }
      icon={
        <div aria-hidden="true">
          <PagoPAPictogram
            background="light"
            className="grid size-14 place-items-center"
            name="Maintenance"
            size={56}
          />
        </div>
      }
      messageClassName="w-full items-stretch gap-2"
    />
  )
}

export { KOState }
