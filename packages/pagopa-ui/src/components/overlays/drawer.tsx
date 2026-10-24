import * as React from "react"

import { X } from "@/components/primitives/icons"
import { Button } from "@/components/primitives/button"
import {
  Drawer as DrawerPrimitive,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/primitives/drawer"

/** Props of {@link Drawer}. The trigger element owns opening and focus return. */
interface DrawerProps {
  /** Element that opens the drawer (`render` target of the trigger). */
  trigger: React.ReactElement
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
  /** Opens the panel initially. */
  defaultOpen?: boolean
  /** Controls whether the open panel blocks interaction with the page. */
  modal?: boolean
  /** Accessible name of the close button. @default "Chiudi pannello" */
  closeLabel?: string
}

function Drawer({
  trigger,
  title,
  description,
  icon,
  children,
  footer,
  footerPlacement = "pinned",
  showHandle,
  direction = "right",
  defaultOpen,
  modal,
  closeLabel = "Chiudi pannello",
}: DrawerProps) {
  const flow = footerPlacement === "flow"

  return (
    <DrawerPrimitive direction={direction} defaultOpen={defaultOpen} modal={modal}>
      <DrawerTrigger render={trigger} />
      <DrawerContent className={flow ? "overflow-y-auto p-6" : undefined} showHandle={showHandle}>
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
          <DrawerClose
            render={
              <Button
                aria-label={closeLabel}
                variant="ghost"
                size="icon"
                className="absolute top-6 right-6 size-6 p-0 text-foreground after:absolute after:-inset-2.5"
              />
            }
          >
            <X aria-hidden="true" className="size-3.5 text-foreground" />
          </DrawerClose>
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
                ? "mt-10 gap-6 p-0 [&>*]:w-full sm:flex-row sm:items-center sm:justify-end sm:[&>*]:w-auto"
                : "gap-6 p-6 [&>*]:w-full sm:flex-row sm:items-center sm:justify-end sm:[&>*]:w-auto"
            }
          >
            {footer}
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </DrawerPrimitive>
  )
}

export { Drawer, type DrawerProps }
