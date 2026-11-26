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
        className={cn(flow && "overflow-y-auto p-6", className)}
        showHandle={showHandle}
        {...panelProps}
      >
        <DrawerHeader className={flow ? "gap-2 p-0" : "gap-2 p-6"}>
          <div data-slot="drawer-title-row" className="flex items-center gap-4">
            {icon ? (
              <span className="flex shrink-0 [&_img]:size-10 [&_svg]:size-10">{icon}</span>
            ) : null}
            {/* The source title style is Titillio/600 (our 700 face): the
                title token carries that weight over the primitive's base
                (the InformativeDrawer reading). The desktop scale starts at
                the 900px device step, so the title keeps the mobile scale
                through the whole tablet range (600–899). */}
            <DrawerTitle className="pr-10 text-title-xs-mobile tablet-md:text-title-xs">
              {title}
            </DrawerTitle>
          </div>
          {!flow && description ? (
            <DrawerDescription className="text-body text-muted-foreground">
              {description}
            </DrawerDescription>
          ) : null}
          <DrawerClosePrimitive
            render={
              <Button
                aria-label={closeLabel}
                variant="ghost"
                size="icon"
                className="absolute top-6 right-6 size-6 p-0 text-foreground after:absolute after:-inset-2.5"
              />
            }
          >
            <PagoPAIcon name="close" className="size-3.5 text-foreground" />
          </DrawerClosePrimitive>
        </DrawerHeader>
        {flow ? (
          <div className="min-h-0 px-0 pt-2">
            {description ? (
              <DrawerDescription render={<div className="text-body text-muted-foreground" />}>
                {description}
              </DrawerDescription>
            ) : null}
            {children}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        )}
        {footer ? (
          <DrawerFooter
            className={
              flow
                ? "mt-10 gap-6 p-0 [&>*]:w-full tablet:flex-row tablet:items-center tablet:justify-end tablet:[&>*]:w-auto"
                : "gap-6 p-6 [&>*]:w-full tablet:flex-row tablet:items-center tablet:justify-end tablet:[&>*]:w-auto"
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
