import * as React from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Dialog } from "@/components/primitives/dialog"

export interface DialogTemplateProps {
  title: string
  description?: React.ReactNode
  /** Message-block slot. */
  children?: React.ReactNode
  /** Panel-level block after the message stack. */
  blocks?: React.ReactNode
  /** Footer slot: primary action first, secondary action after it. */
  actions?: React.ReactNode
  open?: boolean
  className?: string
}

// Source set `1909:98992` ("Diaolog"), five device frames (320/600/900/1200/1536
// × 650). The frame carries the shared 35% `Surface overlay` backdrop and a
// 16px-radius panel: 272×446 on the narrow frames (320/600) and 600×290 from
// 900 up, both with 24px padding and a 24px gap between the body and the
// actions. The body stacks the title (18/28 on the narrow frame, 24/32 above),
// the description and the option row on an 8px gap; the footer is a 16px-gap
// column on the narrow frame and a right-aligned 16px-gap row above it.
//
// The composition answers its own frame, not the browser viewport, so the same
// story renders both layouts (container queries on the page element). The
// dialog parts stay in that frame: Base UI requires a Portal, and the template
// points it at the page element instead of the document body, so the panel is a
// DOM descendant of the page (container queries apply) and both the reviewer
// and the parity capture measure it inside the frame.
const PAGE_HEIGHT = "min-h-(--artboard-height)" // the source 650px artboard

function DialogTemplate({
  title,
  description,
  children,
  blocks,
  actions,
  open = true,
  className,
}: DialogTemplateProps) {
  // The portal container is state, not a ref: the dialog parts mount one commit
  // after the page element exists, so they always land inside the frame.
  const [page, setPage] = React.useState<HTMLDivElement | null>(null)
  const popupRef = React.useRef<HTMLDivElement>(null)
  return (
    <Dialog.Root open={open} modal>
      <div
        ref={setPage}
        className={`@container/dialog-page relative grid ${PAGE_HEIGHT} place-items-center bg-background px-6 py-6 ${className ?? ""}`}
      >
        {page ? (
          <Dialog.Portal container={page}>
            <Dialog.Backdrop className="absolute inset-0 bg-overlay" />
            <Dialog.Popup
              ref={popupRef}
              // The mockup shows the resting state: the panel takes the open
              // focus instead of painting a ring on the first control.
              initialFocus={() => popupRef.current}
              className="relative z-10 flex w-full max-w-(--dialog-width-compact) flex-col gap-6 overflow-auto rounded-xl bg-background p-6 shadow-32 outline-none @3xl/dialog-page:max-w-(--dialog-width)"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-4">
                  <Dialog.Title className="min-w-0 flex-1 text-title-xs-mobile @3xl/dialog-page:text-title-xs">
                    {title}
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="Chiudi finestra"
                    className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-foreground outline-none after:absolute after:-inset-2.5 hover:bg-accent active:bg-accent-active focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <PagoPAIcon name="close" size={24} />
                  </Dialog.Close>
                </div>
                {description ? (
                  <Dialog.Description className="text-body text-muted-foreground">
                    {description}
                  </Dialog.Description>
                ) : null}
                {children}
              </div>
              {blocks}
              {actions ? (
                <div
                  data-slot="dialog-template-actions"
                  className="flex flex-col-reverse gap-4 @3xl/dialog-page:flex-row @3xl/dialog-page:justify-end"
                >
                  {actions}
                </div>
              ) : null}
            </Dialog.Popup>
          </Dialog.Portal>
        ) : null}
      </div>
    </Dialog.Root>
  )
}

export { DialogTemplate }
