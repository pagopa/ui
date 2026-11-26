"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"
import {
  PopoverArrow,
  PopoverClose,
  Popover as PopoverPrimitive,
  PopoverContent,
  PopoverTrigger,
} from "@/components/primitives/popover"
import { X } from "@/components/primitives/icons"

/**
 * Props of {@link Popover}. The controlled (`open` + `onOpenChange`) and
 * uncontrolled (`defaultOpen`) modes share one lifecycle; `ref`, `className`
 * and the standard HTML attributes of a `div` land on the panel.
 */
interface PopoverProps extends Omit<
  React.ComponentProps<"div">,
  "title" | "children" | "className"
> {
  /**
   * Element that opens the popover (`render` target of the trigger) and gets
   * the focus back when it closes. Omit it to open from `open` only.
   */
  trigger?: React.ReactElement
  /** Whether the popover is open; pair it with `onOpenChange`. */
  open?: boolean
  /** Opens the popover initially when `open` is omitted. */
  defaultOpen?: boolean
  /**
   * Runs when the popover asks to open or close: the trigger, an outside press,
   * Escape or the close button.
   */
  onOpenChange?: (open: boolean) => void
  /** Popover content. */
  children: React.ReactNode
  /**
   * Element the panel points at when `trigger` is omitted, so a popover opened
   * from `open` only still knows where to place itself.
   */
  anchor?: HTMLElement | null | React.RefObject<HTMLElement | null>
  /** Horizontal alignment against the trigger. @default "center" */
  align?: "start" | "center" | "end"
  /** Edge of the popover that carries its indicator. @default "top" */
  arrowPosition?: "top" | "bottom"
  /** Allows interaction with the page while the popover is open. */
  modal?: boolean
  /** Accessible name of the panel. @default messages.popover.label */
  label?: string
  /** Accessible name of the close button. @default messages.popover.closeLabel */
  closeLabel?: string
  /** Classes of the panel, merged with the panel's own. */
  className?: string
  /** The panel element. */
  ref?: React.Ref<HTMLDivElement>
}

function Popover({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  children,
  anchor,
  align = "center",
  arrowPosition = "top",
  modal,
  label: labelProp,
  closeLabel: closeLabelProp,
  className,
  ref,
  ...panelProps
}: PopoverProps) {
  const t = useMessages("popover")
  const label = labelProp ?? t.label
  const closeLabel = closeLabelProp ?? t.closeLabel

  return (
    <PopoverPrimitive
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
    >
      {trigger ? <PopoverTrigger render={trigger} /> : null}
      <PopoverContent
        ref={ref}
        anchor={anchor}
        aria-label={label}
        align={align}
        side={arrowPosition === "top" ? "bottom" : "top"}
        className={cn("w-78 overflow-visible bg-transparent p-0 shadow-none", className)}
        {...panelProps}
      >
        <div data-slot="popover-frame" className="flex w-full flex-col items-center">
          {arrowPosition === "top" ? (
            <div className="relative flex h-5 w-full justify-center" aria-hidden="true">
              {/* Placed by the middleware, not centred: when the popup is shifted
                  to stay in the viewport the arrow keeps pointing at the trigger. */}
              <PopoverArrow className="absolute top-0 h-5 w-6 pt-1">
                <svg viewBox="0 0 24 16" className="h-4 w-6">
                  <path d="M12 0 24 16H0L12 0Z" fill="currentColor" />
                </svg>
              </PopoverArrow>
            </div>
          ) : null}
          <div
            data-slot="popover-card"
            className="flex w-full items-start gap-1 rounded-lg bg-popover p-4 text-popover-foreground shadow-32"
          >
            <div data-slot="popover-description" className="min-w-0 flex-1 text-body">
              {children}
            </div>
            <PopoverClose aria-label={closeLabel}>
              <X aria-hidden="true" className="size-2.5 text-primary" />
            </PopoverClose>
          </div>
          {arrowPosition === "bottom" ? (
            <div className="relative flex h-5 w-full justify-center" aria-hidden="true">
              <PopoverArrow className="absolute bottom-0 h-5 w-6 rotate-180 pt-1">
                <svg viewBox="0 0 24 16" className="h-4 w-6">
                  <path d="M12 0 24 16H0L12 0Z" fill="currentColor" />
                </svg>
              </PopoverArrow>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </PopoverPrimitive>
  )
}

export { Popover, type PopoverProps }
