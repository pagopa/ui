import * as React from "react"

import { Icon } from "@/components/icons/icon"
import { Default as CloseIcon } from "@/components/icons/generated/close"
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
const PAGE_HEIGHT = "pui:min-h-(--pui-artboard-height)" // the source 650px artboard

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
        className={`pui:@container/dialog-page pui:relative pui:grid ${PAGE_HEIGHT} pui:place-items-center pui:bg-background pui:px-6 pui:py-6 ${className ?? ""}`}
      >
        {page ? (
          <Dialog.Portal container={page}>
            <Dialog.Backdrop className="pui:absolute pui:inset-0 pui:bg-overlay" />
            <Dialog.Popup
              ref={popupRef}
              // The mockup shows the resting state: the panel takes the open
              // focus instead of painting a ring on the first control.
              initialFocus={() => popupRef.current}
              className="pui:relative pui:z-10 pui:flex pui:w-full pui:max-w-(--pui-dialog-width-compact) pui:flex-col pui:gap-6 pui:overflow-auto pui:rounded-xl pui:bg-background pui:p-6 pui:shadow-32 pui:outline-none pui:@min-page/dialog-page:max-w-(--pui-dialog-width)"
            >
              <div className="pui:flex pui:flex-col pui:gap-2">
                <div className="pui:flex pui:items-start pui:gap-4">
                  <Dialog.Title className="pui:min-w-0 pui:flex-1 pui:text-title-xs-mobile pui:@min-page/dialog-page:text-title-xs">
                    {title}
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="Chiudi finestra"
                    className="pui:relative pui:inline-flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-sm pui:text-foreground pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:hover:bg-accent pui:active:bg-accent-active pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
                  >
                    <Icon source={CloseIcon} size={24} />
                  </Dialog.Close>
                </div>
                {description ? (
                  <Dialog.Description className="pui:text-body pui:text-muted-foreground">
                    {description}
                  </Dialog.Description>
                ) : null}
                {children}
              </div>
              {blocks}
              {actions ? (
                <div
                  data-slot="dialog-template-actions"
                  className="pui:flex pui:flex-col-reverse pui:gap-4 pui:@min-page/dialog-page:flex-row pui:@min-page/dialog-page:justify-end"
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
