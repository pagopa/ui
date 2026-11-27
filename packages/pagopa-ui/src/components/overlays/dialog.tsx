"use client"

import * as React from "react"

import { useMessages, usePortalHost } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"
import { Icon } from "@/components/icons/icon"
import { Default as CloseIcon } from "@/components/icons/generated/close"
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
        <DialogPrimitive.Backdrop className="pui:fixed pui:inset-0 pui:z-50 pui:bg-overlay pui:transition-opacity pui:data-starting-style:opacity-0 pui:data-ending-style:opacity-0" />
        <DialogPrimitive.Popup
          ref={ref}
          className={cn(
            "pui:fixed pui:top-1/2 pui:left-1/2 pui:z-50 pui:flex pui:max-h-[85vh] pui:w-(--pui-dialog-width) pui:max-w-[calc(100vw-var(--pui-page-gutter-lg))] pui:-translate-x-1/2 pui:-translate-y-1/2 pui:flex-col pui:gap-6 pui:overflow-auto pui:rounded-xl pui:bg-background pui:p-6 pui:shadow-32 pui:outline-none pui:transition-opacity pui:data-starting-style:opacity-0 pui:data-ending-style:opacity-0",
            className,
          )}
          {...panelProps}
        >
          <div className="pui:flex pui:flex-col pui:gap-2">
            <DialogPrimitive.Title className="pui:pr-10 pui:text-title-xs-mobile pui:tablet-md:text-title-xs">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="pui:text-body pui:text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
            {children}
          </div>
          {footer ? (
            <div
              data-slot="dialog-footer"
              className="pui:flex pui:flex-col-reverse pui:gap-4 pui:[&>*]:w-full pui:tablet:flex-row pui:tablet:flex-wrap pui:tablet:justify-end pui:tablet:[&>*]:w-auto"
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
                className="pui:absolute pui:top-3.5 pui:right-3.5"
              />
            }
          >
            <Icon source={CloseIcon} />
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
