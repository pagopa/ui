import * as React from "react"

import { X } from "@/components/primitives/icons"
import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/primitives/tooltip"

/** Props of {@link Tooltip}. The trigger element owns opening and focus. */
interface TooltipProps {
  /** Element that opens the tooltip (`render` target of the trigger). */
  trigger: React.ReactElement
  /** Tooltip copy. */
  children: React.ReactNode
  /** Preferred side of the bubble. @default "bottom" */
  side?: "top" | "right" | "bottom" | "left"
  /** Shows the decorative close mark (not an interactive control). @default true */
  showClose?: boolean
}

function Tooltip({ trigger, children, side = "bottom", showClose = true }: TooltipProps) {
  return (
    <TooltipProvider>
      <TooltipPrimitive>
        <TooltipTrigger render={trigger} />
        <TooltipContent side={side}>
          <div data-slot="tooltip-description" className="min-w-0">
            {children}
          </div>
          {showClose ? (
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center"
              data-slot="tooltip-close-mark"
            >
              <X className="size-2.5" strokeWidth={2} />
            </span>
          ) : null}
        </TooltipContent>
      </TooltipPrimitive>
    </TooltipProvider>
  )
}

export { Tooltip, type TooltipProps }
