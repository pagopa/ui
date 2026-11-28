"use client"

import * as React from "react"

import { Icon } from "@/components/icons/icon"
import { Default as CloseIcon } from "@/components/icons/generated/close"
import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/primitives/tooltip"

/**
 * Props of {@link Tooltip}. The controlled (`open` + `onOpenChange`) and
 * uncontrolled (`defaultOpen`) modes share one lifecycle; `ref`, `className`
 * and the standard HTML attributes of a `div` land on the bubble.
 */
interface TooltipProps extends Omit<
  React.ComponentProps<"div">,
  "title" | "children" | "className"
> {
  /**
   * Element that opens the tooltip (`render` target of the trigger). Omit it to
   * open from `open` only.
   */
  trigger?: React.ReactElement
  /** Whether the tooltip is open; pair it with `onOpenChange`. */
  open?: boolean
  /** Opens the tooltip initially when `open` is omitted. */
  defaultOpen?: boolean
  /** Runs when the tooltip asks to open or close. */
  onOpenChange?: (open: boolean) => void
  /** Tooltip copy. */
  children: React.ReactNode
  /**
   * Element the bubble points at when `trigger` is omitted, so a tooltip
   * opened from `open` only still knows where to place itself.
   */
  anchor?: HTMLElement | null | React.RefObject<HTMLElement | null>
  /** Preferred side of the bubble. @default "bottom" */
  side?: "top" | "right" | "bottom" | "left"
  /** Shows the decorative close mark (not an interactive control). @default true */
  showClose?: boolean
  /** Classes of the bubble, merged with the bubble's own. */
  className?: string
  /** The bubble element. */
  ref?: React.Ref<HTMLDivElement>
}

function Tooltip({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  children,
  anchor,
  side = "bottom",
  showClose = true,
  className,
  ref,
  ...panelProps
}: TooltipProps) {
  return (
    <TooltipProvider>
      <TooltipPrimitive open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        {trigger ? <TooltipTrigger render={trigger} /> : null}
        <TooltipContent ref={ref} anchor={anchor} side={side} className={className} {...panelProps}>
          <div data-slot="tooltip-description" className="pui:min-w-0">
            {children}
          </div>
          {showClose ? (
            <span
              aria-hidden="true"
              className="pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center"
              data-slot="tooltip-close-mark"
            >
              <Icon source={CloseIcon} className="pui:size-2.5" />
            </span>
          ) : null}
        </TooltipContent>
      </TooltipPrimitive>
    </TooltipProvider>
  )
}

export { Tooltip, type TooltipProps }
