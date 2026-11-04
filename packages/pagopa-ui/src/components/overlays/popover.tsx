"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"
import {
  PopoverArrow,
  PopoverClose,
  Popover as PopoverPrimitive,
  PopoverContent,
  PopoverTrigger,
} from "@/components/primitives/popover"
import { X } from "@/components/primitives/icons"

/** Props of {@link Popover}. The trigger element owns opening and focus. */
interface PopoverProps {
  /** Element that opens the popover (`render` target of the trigger). */
  trigger: React.ReactElement
  /** Popover content. */
  children: React.ReactNode
  /** Horizontal alignment against the trigger. @default "center" */
  align?: "start" | "center" | "end"
  /** Edge of the popover that carries its indicator. @default "top" */
  arrowPosition?: "top" | "bottom"
  /** Starts open; useful for controlled source-frame stories. */
  defaultOpen?: boolean
  /** Allows interaction with the page while the popover is open. */
  modal?: boolean
  /** Accessible name of the panel. @default messages.popover.label */
  label?: string
  /** Accessible name of the close button. @default messages.popover.closeLabel */
  closeLabel?: string
}

function Popover({
  trigger,
  children,
  align = "center",
  arrowPosition = "top",
  defaultOpen,
  modal,
  label: labelProp,
  closeLabel: closeLabelProp,
}: PopoverProps) {
  const t = useMessages("popover")
  const label = labelProp ?? t.label
  const closeLabel = closeLabelProp ?? t.closeLabel

  return (
    <PopoverPrimitive defaultOpen={defaultOpen} modal={modal}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        aria-label={label}
        align={align}
        side={arrowPosition === "top" ? "bottom" : "top"}
        className="w-78 overflow-visible bg-transparent p-0 shadow-none"
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
