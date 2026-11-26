"use client"

import * as React from "react"

import { useMessages, usePortalHost } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"
import { X } from "@/components/primitives/icons"
import { Button } from "@/components/primitives/button"
import { Dialog as DialogPrimitive } from "@/components/primitives/dialog"

/**
 * Props of {@link Dialog}. The controlled (`open` + `onOpenChange`) and
 * uncontrolled (`defaultOpen`) modes share one lifecycle; `ref`, `className`
 * and the standard HTML attributes of a `div` land on the panel.
 */
interface DialogProps extends Omit<
  React.ComponentProps<"div">,
  "title" | "children" | "className"
> {
  /**
   * Element that opens the dialog (`render` target of the trigger) and gets the
   * focus back when the dialog closes. Omit it to open from `open` only.
   */
  trigger?: React.ReactElement
  /** Whether the dialog is open; pair it with `onOpenChange`. */
  open?: boolean
  /** Opens the dialog initially when `open` is omitted. */
  defaultOpen?: boolean
  /**
   * Runs when the dialog asks to open or close: the trigger, an outside press,
   * Escape, the close button or a {@link DialogClose}.
   */
  onOpenChange?: (open: boolean) => void
  /** Dialog title; also the dialog's accessible name. */
  title: string
  /** Optional supporting copy. */
  description?: string
  /** Optional body content. */
  children?: React.ReactNode
  /** Optional actions row. */
  footer?: React.ReactNode
  /** Accessible name of the close button. @default messages.dialog.closeLabel */
  closeLabel?: string
  /** Classes of the panel, merged with the panel's own. */
  className?: string
  /** The panel element. */
  ref?: React.Ref<HTMLDivElement>
}

function Dialog({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel: closeLabelProp,
  className,
  ref,
  ...panelProps
}: DialogProps) {
  const t = useMessages("dialog")
  const closeLabel = closeLabelProp ?? t.closeLabel
  const portalHost = usePortalHost()

  return (
    <DialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger render={trigger} /> : null}
      <DialogPrimitive.Portal container={portalHost}>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-overlay transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <DialogPrimitive.Popup
          ref={ref}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-(--dialog-width) max-w-[calc(100vw-var(--page-gutter-lg))] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 overflow-auto rounded-xl bg-background p-6 shadow-32 outline-none transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0",
            className,
          )}
          {...panelProps}
        >
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

/** Props of {@link DialogClose}: the caller's button, as a close action. */
type DialogCloseProps = React.ComponentProps<typeof Button>

/**
 * A dialog close action: renders the caller's button and closes the panel it
 * sits in, so a footer action closes the dialog from inside the composition.
 */
function DialogClose(props: DialogCloseProps) {
  return <DialogPrimitive.Close render={<Button {...props} />} />
}

export { Dialog, DialogClose, type DialogProps, type DialogCloseProps }
