import * as React from "react"

import { Icon } from "@/components/icons/icon"
import { Default as CloseIcon } from "@/components/icons/generated/close"
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
  bottom: "pui:min-h-(--pui-artboard-height)",
  right: "pui:min-h-(--pui-artboard-height-tall)",
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
        className={`pui:relative pui:grid ${FRAME_HEIGHT[direction]} pui:place-items-end pui:bg-background ${className ?? ""}`}
      >
        <DrawerContent
          // The source side panel is 417px wide (the reviewed component's 384px
          // default belongs to its own source variants); this composition shows
          // no drag handle.
          className={
            side
              ? "pui:w-full pui:tablet:max-w-(--pui-drawer-width-wide) pui:[&>[data-slot=drawer-handle]]:hidden"
              : "pui:[&>[data-slot=drawer-handle]]:hidden"
          }
        >
          <div
            data-slot="drawer-template-body"
            className="pui:flex pui:min-h-0 pui:flex-1 pui:flex-col pui:overflow-y-auto pui:p-6"
          >
            <div data-slot="drawer-template-head" className="pui:flex pui:items-start pui:gap-4">
              {icon ? (
                <span
                  aria-hidden="true"
                  className="pui:flex pui:size-10 pui:shrink-0 pui:items-center pui:justify-center pui:[&_figure]:block pui:[&_figure]:gap-0 pui:[&_img]:size-10"
                >
                  {icon}
                </span>
              ) : null}
              {/* The source title style is Titillio/600 (our 700 face): the
                  title token carries that weight over the primitive's base. */}
              <div className="pui:min-w-0 pui:flex-1">
                <DrawerTitle className={side ? "pui:text-title-xs" : "pui:text-title-xs-mobile"}>
                  {title}
                </DrawerTitle>
              </div>
              <DrawerClose
                aria-label="Chiudi pannello"
                className="pui:relative pui:inline-flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-sm pui:text-foreground pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:hover:bg-accent pui:active:bg-accent-active pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
              >
                <Icon source={CloseIcon} size={24} />
              </DrawerClose>
            </div>
            <DrawerDescription className="pui:mt-2 pui:text-body pui:text-muted-foreground">
              {description}
            </DrawerDescription>
            {actions ? (
              <div
                data-slot="drawer-template-actions"
                className={`pui:mt-10 pui:flex pui:gap-2 ${side ? "pui:justify-end" : "pui:flex-col pui:[&>*]:w-full"}`}
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
