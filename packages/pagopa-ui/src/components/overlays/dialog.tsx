import * as React from "react"

import { X } from "@/components/primitives/icons"
import { Button } from "@/components/primitives/button"
import { Dialog as DialogPrimitive } from "@/components/primitives/dialog"

/** Props of {@link Dialog}. The trigger element owns opening and focus return. */
interface DialogProps {
  /** Element that opens the dialog (`render` target of the trigger). */
  trigger: React.ReactElement
  /** Dialog title; also the dialog's accessible name. */
  title: string
  /** Optional supporting copy. */
  description?: string
  /** Optional body content. */
  children?: React.ReactNode
  /** Optional actions row. */
  footer?: React.ReactNode
  /** Accessible name of the close button. @default "Chiudi finestra" */
  closeLabel?: string
}

function Dialog({
  trigger,
  title,
  description,
  children,
  footer,
  closeLabel = "Chiudi finestra",
}: DialogProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger render={trigger} />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-overlay transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-(--dialog-width) max-w-[calc(100vw-var(--page-gutter-lg))] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 overflow-auto rounded-xl bg-background p-6 shadow-32 outline-none transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0">
          <div className="flex flex-col gap-2">
            <DialogPrimitive.Title className="pr-10 text-title-xs-mobile tablet-md:text-title-xs">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-body text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
            {children}
          </div>
          {footer ? (
            <div
              data-slot="dialog-footer"
              className="flex flex-col-reverse gap-4 [&>*]:w-full tablet:flex-row tablet:flex-wrap tablet:justify-end tablet:[&>*]:w-auto"
            >
              {footer}
            </div>
          ) : null}
          <DialogPrimitive.Close
            render={
              <Button
                aria-label={closeLabel}
                variant="ghost"
                size="icon"
                className="absolute top-3.5 right-3.5"
              />
            }
          >
            <X aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { Dialog, type DialogProps }
