import * as React from "react"

import { X } from "@/components/primitives/icons"
import { Button } from "@/components/primitives/button"

function Cookies({
  children,
  onAccept,
  onReject,
  onLearnMore,
  onDismiss,
  closeLabel = "Chiudi",
  label = "Preferenze cookie",
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
  /** Accessible name of the close control. @default "Chiudi" */
  closeLabel?: string
  /** Accessible name of the bar. @default "Preferenze cookie" */
  label?: string
}) {
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
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-4xl flex-col gap-8 bg-background p-6 shadow-32 desktop:flex-row desktop:flex-nowrap desktop:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start justify-between gap-4 tablet:gap-6 desktop:items-center">
        <p className="min-w-0 flex-1 text-label-mini text-muted-foreground">{children}</p>
        {closeButton ? <span className="desktop:hidden">{closeButton}</span> : null}
      </div>
      <div className="flex flex-col gap-6 max-tablet:w-full tablet:flex-row tablet:flex-wrap tablet:items-center">
        {onLearnMore ? (
          <Button
            variant="ghost"
            // Source ghost action: an 89×22 text button with no padding inside
            // the 24px button block (1360:23890), centred on the mobile stack
            // (the source `Button block` aligns its children to the centre).
            // The 44px pointer target comes from the invisible ::after
            // expansion, not the visible box.
            className="relative min-h-0 px-0 py-0 after:absolute after:inset-x-0 after:-inset-y-3 max-tablet:self-center"
            onClick={onLearnMore}
          >
            Scopri di più
          </Button>
        ) : null}
        <Button className="max-tablet:w-full" onClick={onReject}>
          Rifiuta tutti
        </Button>
        <Button className="max-tablet:w-full" onClick={onAccept}>
          Accetta tutti
        </Button>
        {closeButton ? <span className="hidden desktop:block">{closeButton}</span> : null}
      </div>
    </section>
  )
}

export { Cookies }
