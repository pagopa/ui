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
  down: "inset-x-0 bottom-0 max-h-dvh rounded-t-xl translate-y-[var(--drawer-swipe-movement-y)] data-starting-style:translate-y-full data-ending-style:translate-y-full",
  up: "inset-x-0 top-0 max-h-dvh rounded-b-xl translate-y-[var(--drawer-swipe-movement-y)] data-starting-style:-translate-y-full data-ending-style:-translate-y-full",
  right:
    "inset-y-0 right-0 h-full w-104 max-w-full translate-x-[var(--drawer-swipe-movement-x)] data-starting-style:translate-x-full data-ending-style:translate-x-full",
  left: "inset-y-0 left-0 h-full w-104 max-w-full translate-x-[var(--drawer-swipe-movement-x)] data-starting-style:-translate-x-full data-ending-style:-translate-x-full",
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

function DrawerPortal({ ...props }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
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
        "fixed inset-0 z-50 bg-overlay transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0",
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
        className="pointer-events-none fixed inset-0 z-50"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={(state) =>
            cn(
              "group/drawer-popup pointer-events-auto fixed z-50 flex h-auto flex-col bg-popover text-label-mini text-popover-foreground shadow-32 outline-none transition-transform duration-300 data-swiping:transition-none",
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
              className="mx-auto mt-4 hidden h-1 w-25 shrink-0 rounded-full bg-muted group-data-[swipe-direction=down]/drawer-popup:block"
            />
          ) : null}
          <DrawerPrimitive.Content
            data-slot="drawer-content-body"
            className="flex min-h-0 flex-1 flex-col"
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
        // `md:gap-*` here would beat the composed `gap-2` above md and break
        // the source's 8px head-to-description spacing.
        "flex flex-col gap-0.5 p-4 group-data-[swipe-direction=down]/drawer-popup:text-center group-data-[swipe-direction=up]/drawer-popup:text-center md:text-left",
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
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("font-heading text-body-sb text-foreground", className)}
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
      className={cn("text-body text-muted-foreground", className)}
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
