"use client"

// Base UI Drawer, isolated so the library keeps a single seam to the
// third-party implementation: only the primitives layer may import it (import
// layer contract, enforced by `pnpm layers:check`). The composed Drawer lives in overlays.
//
// Base UI has no `direction` prop: `swipeDirection` only selects the gesture
// that dismisses the panel, so the geometry of each edge is ours (Tailwind
// classes below) and the swipe offset follows the `--drawer-swipe-movement-*`
// variables Base UI publishes on the popup. The keyboard perimeter, focus trap,
// Escape handling, scroll lock, outside press and focus restore come from the
// Dialog core the Drawer extends; the popup keeps the panel styling so the
// composed close button can stay absolutely positioned inside it.
import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { usePortalHost } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"

type DrawerDirection = "top" | "right" | "bottom" | "left"
type DrawerSwipeDirection = "up" | "right" | "down" | "left"

const swipeDirectionByDirection: Record<DrawerDirection, DrawerSwipeDirection> = {
  top: "up",
  right: "right",
  bottom: "down",
  left: "left",
}

// Panel geometry per edge: the swipe offset is always applied (the variables
// resolve to 0px outside a gesture) so dragging follows the pointer, while
// enter/exit translate the panel off its own edge.
//
// Device geometry: the source desktop panels are square and stroke-less; only
// the mobile sheets keep the 16px top radius. All panels carry the source
// "Shadow 32" elevation (the Filters/Sort source variants omit it).
const panelBySwipeDirection: Record<DrawerSwipeDirection, string> = {
  down: "pui:inset-x-0 pui:bottom-0 pui:max-h-dvh pui:rounded-t-xl pui:translate-y-[var(--drawer-swipe-movement-y)] pui:data-starting-style:translate-y-full pui:data-ending-style:translate-y-full",
  up: "pui:inset-x-0 pui:top-0 pui:max-h-dvh pui:rounded-b-xl pui:translate-y-[var(--drawer-swipe-movement-y)] pui:data-starting-style:-translate-y-full pui:data-ending-style:-translate-y-full",
  right:
    "pui:inset-y-0 pui:right-0 pui:h-full pui:w-104 pui:max-w-full pui:translate-x-[var(--drawer-swipe-movement-x)] pui:data-starting-style:translate-x-full pui:data-ending-style:translate-x-full",
  left: "pui:inset-y-0 pui:left-0 pui:h-full pui:w-104 pui:max-w-full pui:translate-x-[var(--drawer-swipe-movement-x)] pui:data-starting-style:-translate-x-full pui:data-ending-style:-translate-x-full",
}

function Drawer({
  direction = "right",
  ...props
}: Omit<React.ComponentProps<typeof DrawerPrimitive.Root>, "swipeDirection"> & {
  direction?: DrawerDirection
}) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      swipeDirection={swipeDirectionByDirection[direction]}
      {...props}
    />
  )
}

function DrawerTrigger({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  container,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  const portalHost = usePortalHost()
  return (
    <DrawerPrimitive.Portal
      container={container ?? portalHost}
      data-slot="drawer-portal"
      {...props}
    />
  )
}

function DrawerClose({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DrawerPrimitive.Backdrop>, "className"> & {
  className?: string
}) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "pui:fixed pui:inset-0 pui:z-50 pui:bg-overlay pui:transition-opacity pui:duration-300 pui:data-starting-style:opacity-0 pui:data-ending-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  showHandle = true,
  ...props
}: Omit<React.ComponentProps<typeof DrawerPrimitive.Popup>, "className"> & {
  className?: string
  showHandle?: boolean
}) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="pui:pointer-events-none pui:fixed pui:inset-0 pui:z-50"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={(state) =>
            cn(
              "group/drawer-popup pui:pointer-events-auto pui:fixed pui:z-50 pui:flex pui:h-auto pui:flex-col pui:bg-popover pui:text-label-mini pui:text-popover-foreground pui:shadow-32 pui:outline-none pui:transition-transform pui:duration-300 pui:data-swiping:transition-none",
              panelBySwipeDirection[state.swipeDirection],
              className,
            )
          }
          {...props}
        >
          {showHandle ? (
            <div
              data-slot="drawer-handle"
              aria-hidden="true"
              className="pui:mx-auto pui:mt-4 pui:hidden pui:h-1 pui:w-25 pui:shrink-0 pui:rounded-full pui:bg-muted pui:group-data-[swipe-direction=down]/drawer-popup:block"
            />
          ) : null}
          <DrawerPrimitive.Content
            data-slot="drawer-content-body"
            className="pui:flex pui:min-h-0 pui:flex-1 pui:flex-col"
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        // The base gap is the only horizontal-inset-independent default: an
        // `tablet-md:gap-*` here would beat the composed `gap-2` above
        // `tablet-md` and break
        // the source's 8px head-to-description spacing.
        "pui:flex pui:flex-col pui:gap-0.5 pui:p-4 pui:group-data-[swipe-direction=down]/drawer-popup:text-center pui:group-data-[swipe-direction=up]/drawer-popup:text-center pui:tablet-md:text-left",
        className,
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("pui:mt-auto pui:flex pui:flex-col pui:gap-2 pui:p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("pui:font-heading pui:text-body-sb pui:text-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("pui:text-body pui:text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
