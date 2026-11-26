"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { usePortalHost } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverClose({ className, ...props }: PopoverPrimitive.Close.Props) {
  return (
    <PopoverPrimitive.Close
      data-slot="popover-close"
      className={cn(
        "pui:relative pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-md pui:after:absolute pui:after:-inset-2.5 pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  )
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  anchor,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor"
  >) {
  const portalHost = usePortalHost()
  return (
    <PopoverPrimitive.Portal container={portalHost}>
      <PopoverPrimitive.Positioner
        anchor={anchor}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="pui:isolate pui:z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "pui:z-50 pui:flex pui:w-78 pui:origin-(--transform-origin) pui:flex-col pui:gap-1 pui:rounded-lg pui:bg-popover pui:p-4 pui:text-body pui:text-popover-foreground pui:shadow-32 pui:outline-hidden pui:duration-100 pui:data-[side=bottom]:slide-in-from-top-2 pui:data-[side=inline-end]:slide-in-from-left-2 pui:data-[side=inline-start]:slide-in-from-right-2 pui:data-[side=left]:slide-in-from-right-2 pui:data-[side=right]:slide-in-from-left-2 pui:data-[side=top]:slide-in-from-bottom-2 pui:data-open:animate-in pui:data-open:fade-in-0 pui:data-open:zoom-in-95 pui:data-closed:animate-out pui:data-closed:fade-out-0 pui:data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

/**
 * Inert passthrough kept for API compatibility: Base UI has no Anchor part.
 * Positioning anchors to the trigger by default; to anchor elsewhere, pass
 * `anchor` to the Positioner (see PopoverContent).
 */
function PopoverAnchor({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-anchor" className={className} {...props} />
}

/**
 * Arrow of the popup. The placement middleware anchors it to the trigger, so it
 * keeps pointing at the trigger even when the popup is shifted to stay in the
 * viewport. Position it against the popup and give it a box; the middleware only
 * sets the cross-axis offset.
 */
function PopoverArrow({ className, ...props }: PopoverPrimitive.Arrow.Props) {
  return (
    <PopoverPrimitive.Arrow
      data-slot="popover-arrow"
      className={cn("pui:text-popover", className)}
      {...props}
    />
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("pui:flex pui:flex-col pui:gap-0.5 pui:text-label-mini", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("pui:text-body-sb", className)}
      {...props}
    />
  )
}

function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("pui:text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
