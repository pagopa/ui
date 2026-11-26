"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import {
  Drawer as DrawerPrimitive,
  DrawerClose as DrawerClosePrimitive,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/primitives/drawer"

/**
 * Props of {@link Drawer}. The controlled (`open` + `onOpenChange`) and
 * uncontrolled (`defaultOpen`) modes share one lifecycle; `ref`, `className`
 * and the standard HTML attributes of a `div` land on the panel.
 */
interface DrawerProps extends Omit<
  React.ComponentProps<"div">,
  "title" | "children" | "className"
> {
  /**
   * Element that opens the drawer (`render` target of the trigger) and gets the
   * focus back when the drawer closes. Omit it to open from `open` only.
   */
  trigger?: React.ReactElement
  /** Whether the drawer is open; pair it with `onOpenChange`. */
  open?: boolean
  /** Opens the drawer initially when `open` is omitted. */
  defaultOpen?: boolean
  /**
   * Runs when the drawer asks to open or close: the trigger, an outside press,
   * Escape, the close button or a {@link DrawerClose}.
   */
  onOpenChange?: (open: boolean) => void
  /** Drawer title; also the drawer's accessible name. */
  title: string
  /** Optional supporting copy. */
  description?: React.ReactNode
  /** Optional icon (source pictogram) of the header. */
  icon?: React.ReactNode
  /** Optional body content. */
  children?: React.ReactNode
  /** Optional actions row. */
  footer?: React.ReactNode
  /** Keeps the footer after the content instead of pinning it to the panel edge. */
  footerPlacement?: "pinned" | "flow"
  /** Shows the decorative pill handle on bottom sheets. @default true */
  showHandle?: boolean
  /** Edge the panel slides from. @default "right" */
  direction?: "top" | "right" | "bottom" | "left"
  /** Controls whether the open panel blocks interaction with the page. */
  modal?: boolean
  /** Accessible name of the close button. @default messages.drawer.closeLabel */
  closeLabel?: string
  /** Classes of the panel, merged with the panel's own. */
  className?: string
  /** The panel element. */
  ref?: React.Ref<HTMLDivElement>
}

function Drawer({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  footerPlacement = "pinned",
  showHandle,
  direction = "right",
  modal,
  closeLabel: closeLabelProp,
  className,
  ref,
  ...panelProps
}: DrawerProps) {
  const t = useMessages("drawer")
  const closeLabel = closeLabelProp ?? t.closeLabel

  const flow = footerPlacement === "flow"

  return (
    <DrawerPrimitive
      direction={direction}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
    >
      {trigger ? <DrawerTrigger render={trigger} /> : null}
      <DrawerContent
        ref={ref}
        className={cn(flow && "pui:overflow-y-auto pui:p-6", className)}
        showHandle={showHandle}
        {...panelProps}
      >
        <DrawerHeader className={flow ? "pui:gap-2 pui:p-0" : "pui:gap-2 pui:p-6"}>
          <div data-slot="drawer-title-row" className="pui:flex pui:items-center pui:gap-4">
            {icon ? (
              <span className="pui:flex pui:shrink-0 pui:[&_img]:size-10 pui:[&_svg]:size-10">
                {icon}
              </span>
            ) : null}
            {/* The source title style is Titillio/600 (our 700 face): the
                title token carries that weight over the primitive's base
                (the InformativeDrawer reading). The desktop scale starts at
                the 900px device step, so the title keeps the mobile scale
                through the whole tablet range (600–899). */}
            <DrawerTitle className="pui:pr-10 pui:text-title-xs-mobile pui:tablet-md:text-title-xs">
              {title}
            </DrawerTitle>
          </div>
          {!flow && description ? (
            <DrawerDescription className="pui:text-body pui:text-muted-foreground">
              {description}
            </DrawerDescription>
          ) : null}
          <DrawerClosePrimitive
            render={
              <Button
                aria-label={closeLabel}
                variant="ghost"
                size="icon"
                className="pui:absolute pui:top-6 pui:right-6 pui:size-6 pui:p-0 pui:text-foreground pui:after:absolute pui:after:-inset-2.5"
              />
            }
          >
            <PagoPAIcon name="close" className="pui:size-3.5 pui:text-foreground" />
          </DrawerClosePrimitive>
        </DrawerHeader>
        {flow ? (
          <div className="pui:min-h-0 pui:px-0 pui:pt-2">
            {description ? (
              <DrawerDescription
                render={<div className="pui:text-body pui:text-muted-foreground" />}
              >
                {description}
              </DrawerDescription>
            ) : null}
            {children}
          </div>
        ) : (
          <div className="pui:min-h-0 pui:flex-1 pui:overflow-y-auto pui:p-6">{children}</div>
        )}
        {footer ? (
          <DrawerFooter
            className={
              flow
                ? "pui:mt-10 pui:gap-6 pui:p-0 pui:[&>*]:w-full pui:tablet:flex-row pui:tablet:items-center pui:tablet:justify-end pui:tablet:[&>*]:w-auto"
                : "pui:gap-6 pui:p-6 pui:[&>*]:w-full pui:tablet:flex-row pui:tablet:items-center pui:tablet:justify-end pui:tablet:[&>*]:w-auto"
            }
          >
            {footer}
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </DrawerPrimitive>
  )
}

/** Props of {@link DrawerClose}: the caller's button, as a close action. */
type DrawerCloseProps = React.ComponentProps<typeof Button>

/**
 * A drawer close action: renders the caller's button and closes the panel it
 * sits in, so a footer action closes the drawer from inside the composition.
 */
function DrawerClose(props: DrawerCloseProps) {
  return <DrawerClosePrimitive render={<Button {...props} />} />
}

export { Drawer, DrawerClose, type DrawerProps, type DrawerCloseProps }
