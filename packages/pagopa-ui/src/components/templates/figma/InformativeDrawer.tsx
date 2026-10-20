import * as React from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/primitives/drawer"

export interface InformativeDrawerProps {
  title: string
  description: React.ReactNode
  /** Pictogram of the drawer (the source uses the Error pictogram). */
  icon?: React.ReactNode
  /** The action row of the drawer. */
  actions?: React.ReactNode
  direction?: "bottom" | "right"
  open?: boolean
  className?: string
}

// Source set `1992:127582` ("Informative Drawer"), five device frames: a bottom
// sheet on the 320×650 frame (full width, 16px top corners, no drag handle in
// this composition) and a 417×800 square side panel from 600 up. Both keep the
// 35% surface overlay, 24px padding, the 40px pictogram row at a 16px gap, the
// 8px gap to the multi-paragraph description and the source 40px gap before the
// action (full width on the sheet, intrinsic and right-aligned on the panel).
//
// The device decides the edge, so the caller passes the direction its frame
// uses (the library Drawer maps it to the swipe gesture and the panel
// geometry); the frame height follows the same choice.
const FRAME_HEIGHT = {
  bottom: "min-h-(--artboard-height)",
  right: "min-h-(--artboard-height-tall)",
} // 650 / 800

// The source title style is Titillio/600 (our 700 face): the title token
// carries that weight over the primitive's base.
function InformativeDrawer({
  title,
  description,
  icon,
  actions,
  direction = "bottom",
  open = true,
  className,
}: InformativeDrawerProps) {
  const side = direction === "right"
  return (
    <Drawer direction={direction} open={open} modal>
      <div
        className={`relative grid ${FRAME_HEIGHT[direction]} place-items-end bg-background ${className ?? ""}`}
      >
        <DrawerContent
          // The source side panel is 417px wide (the reviewed component's 384px
          // default belongs to its own source variants); this composition shows
          // no drag handle.
          className={
            side
              ? "w-full sm:max-w-(--drawer-width-wide) [&>[data-slot=drawer-handle]]:hidden"
              : "[&>[data-slot=drawer-handle]]:hidden"
          }
        >
          <div
            data-slot="drawer-template-body"
            className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6"
          >
            <div data-slot="drawer-template-head" className="flex items-start gap-4">
              {icon ? (
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center [&_figure]:block [&_figure]:gap-0 [&_img]:size-10"
                >
                  {icon}
                </span>
              ) : null}
              {/* The source title style is Titillio/600 (our 700 face): the
                  title token carries that weight over the primitive's base. */}
              <div className="min-w-0 flex-1">
                <DrawerTitle className={side ? "text-title-xs" : "text-title-xs-mobile"}>
                  {title}
                </DrawerTitle>
              </div>
              <DrawerClose
                aria-label="Chiudi pannello"
                className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-foreground outline-none after:absolute after:-inset-2.5 hover:bg-accent active:bg-accent-active focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <PagoPAIcon name="close" size={24} />
              </DrawerClose>
            </div>
            <DrawerDescription className="mt-2 text-body text-muted-foreground">
              {description}
            </DrawerDescription>
            {actions ? (
              <div
                data-slot="drawer-template-actions"
                className={`mt-10 flex gap-2 ${side ? "justify-end" : "flex-col [&>*]:w-full"}`}
              >
                {actions}
              </div>
            ) : null}
          </div>
        </DrawerContent>
      </div>
    </Drawer>
  )
}

export { InformativeDrawer }
