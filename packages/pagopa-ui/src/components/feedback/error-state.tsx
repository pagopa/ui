"use client"

import * as React from "react"

import { Icon } from "@/components/icons/icon"
import { Default as ContentCopyIcon } from "@/components/icons/generated/content-copy"
import { PictogramFigure } from "@/components/icons/pictogram-figure"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { StatePanel, type StateProps } from "./state-panel"
import { maintenance } from "pagopa-ui-artwork/pictograms/maintenance"

/** Props of the negative outcome state, plus the optional error-code row. */
export type ErrorStateProps = Omit<StateProps, "extra"> & {
  /** Error code of the state, shown in a copyable row. */
  code?: string
  /** Label of the code row; drives the copy button's accessible name. @default messages.errorState.codeLabel */
  codeLabel?: string
  /** Complete accessible name of the copy control, from the row label. @default messages.errorState.copyLabel */
  copyLabel?: (codeLabel: string) => string
  /** Announced text once the code is in the clipboard. @default messages.errorState.copiedLabel */
  copiedLabel?: string
  /** Announced text when the clipboard write fails. @default messages.errorState.copyErrorLabel */
  copyErrorLabel?: string
  /** Called only after a successful clipboard write. */
  onCopy?: () => void
}

/**
 * Negative outcome: title, description, native actions and an optional copyable
 * error-code row.
 *
 * Figma: KOState (node 749:5695)
 */
function ErrorState({
  code,
  codeLabel: codeLabelProp,
  copyLabel: copyLabelProp,
  copiedLabel: copiedLabelProp,
  copyErrorLabel: copyErrorLabelProp,
  onCopy,
  className,
  ref,
  ...props
}: ErrorStateProps) {
  const t = useMessages("errorState")
  const codeLabel = codeLabelProp ?? t.codeLabel
  const copyLabel = copyLabelProp ?? t.copyLabel
  const copiedLabel = copiedLabelProp ?? t.copiedLabel
  const copyErrorLabel = copyErrorLabelProp ?? t.copyErrorLabel

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
      data-slot="error-state"
      {...props}
      ref={ref}
      actionsClassName="pui:mx-auto pui:w-full pui:max-w-(--pui-state-width) pui:flex-col pui:flex-nowrap pui:items-center pui:gap-6"
      className={cn("pui:w-full pui:max-w-none", className)}
      contentClassName="pui:w-full pui:max-w-none pui:tablet-md:max-w-(--pui-state-width)"
      extra={
        code ? (
          <div
            data-slot="ko-error-code-field"
            className="pui:flex pui:min-h-12 pui:w-full pui:max-w-(--pui-state-width) pui:items-center pui:gap-3 pui:rounded-lg pui:border pui:border-border pui:bg-background pui:px-3 pui:text-left"
          >
            <span
              data-slot="ko-error-code-value"
              className="pui:min-w-0 pui:flex-1 pui:font-mono pui:text-foreground pui:text-mono pui:wrap-anywhere"
            >
              {code}
            </span>
            <button
              type="button"
              onClick={copyCode}
              aria-label={copyLabel(codeLabel)}
              data-slot="ko-error-code-copy"
              className="pui:grid pui:size-11 pui:shrink-0 pui:place-items-center pui:rounded-md pui:text-primary pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
            >
              <Icon source={ContentCopyIcon} />
            </button>
            <output aria-live="polite" className="pui:sr-only">
              {copyState === "copied" ? copiedLabel : ""}
            </output>
            {copyState === "failed" ? (
              <span role="alert" className="pui:sr-only">
                {copyErrorLabel}
              </span>
            ) : null}
          </div>
        ) : undefined
      }
      icon={
        <div aria-hidden="true">
          <PictogramFigure
            asset={maintenance}
            background="light"
            className="pui:grid pui:size-14 pui:place-items-center"
            size={56}
          />
        </div>
      }
      messageClassName="pui:w-full pui:items-stretch pui:gap-2"
    />
  )
}

export { ErrorState }
