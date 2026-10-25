"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"
import { X } from "@/components/primitives/icons"
import { Button } from "@/components/primitives/button"

function Cookies({
  children,
  onAccept,
  onReject,
  onLearnMore,
  onDismiss,
  closeLabel: closeLabelProp,
  label: labelProp,
}: {
  /** Title and copy of the bar. */
  children: React.ReactNode
  /** Fired by the "Accetta tutti" action. */
  onAccept: () => void
  /** Fired by the "Rifiuta tutti" action. */
  onReject: () => void
  /** Fired by the text action "Scopri di più". */
  onLearnMore?: () => void
  /** Renders the close control when provided. */
  onDismiss?: () => void
  /** Accessible name of the close control. @default messages.cookies.closeLabel */
  closeLabel?: string
  /** Accessible name of the bar. @default messages.cookies.label */
  label?: string
}) {
  const t = useMessages("cookies")
  const closeLabel = closeLabelProp ?? t.closeLabel
  const label = labelProp ?? t.label

  // Source `Device=Mobile` (1360:12856): the close sits beside the copy, the
  // three actions stack full width under it; the desktop row keeps the close
  // with the action block.
  const closeButton = onDismiss ? (
    <button
      type="button"
      aria-label={closeLabel}
      onClick={onDismiss}
      className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <X aria-hidden="true" />
    </button>
  ) : null

  return (
    <section
      aria-label={label}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 shadow-32 lg:flex-row lg:flex-nowrap lg:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start justify-between gap-4 sm:gap-6 lg:items-center">
        <p className="min-w-0 flex-1 text-label-mini text-muted-foreground">{children}</p>
        {closeButton ? <span className="lg:hidden">{closeButton}</span> : null}
      </div>
      <div className="flex flex-col gap-6 max-sm:w-full sm:flex-row sm:flex-wrap sm:items-center">
        {onLearnMore ? (
          <Button
            variant="ghost"
            // Source ghost action: an 89×22 text button with no padding inside
            // the 24px button block (1360:23890), centred on the mobile stack
            // (the source `Button block` aligns its children to the centre).
            // The 44px pointer target comes from the invisible ::after
            // expansion, not the visible box.
            className="relative min-h-0 px-0 py-0 after:absolute after:inset-x-0 after:-inset-y-3 max-sm:self-center"
            onClick={onLearnMore}
          >
            Scopri di più
          </Button>
        ) : null}
        <Button className="max-sm:w-full" onClick={onReject}>
          Rifiuta tutti
        </Button>
        <Button className="max-sm:w-full" onClick={onAccept}>
          Accetta tutti
        </Button>
        {closeButton ? <span className="hidden lg:block">{closeButton}</span> : null}
      </div>
    </section>
  )
}

export { Cookies }
