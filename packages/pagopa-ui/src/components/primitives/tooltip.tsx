"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { usePortalHost } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"

const arrowDirectionTopPath =
  "M15.2 4.26667C13.6 2.13333 10.4 2.13333 8.8 4.26667L0 16H24L15.2 4.26667Z"
const arrowDirectionBottomPath =
  "M15.2 11.7333C13.6 13.8667 10.4 13.8667 8.8 11.7333L0 0H24L15.2 11.7333Z"

function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  anchor,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor"
  >) {
  const isVerticalSide = side === "top" || side === "bottom"
  const portalHost = usePortalHost()

  return (
    <TooltipPrimitive.Portal container={portalHost}>
      <TooltipPrimitive.Positioner
        anchor={anchor}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="pui:isolate pui:z-50"
        data-slot="tooltip-positioner"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          role="tooltip"
          className={cn(
            "pui:z-50 pui:inline-flex pui:w-fit pui:max-w-78 pui:origin-(--transform-origin) pui:items-start pui:gap-1 pui:rounded-lg pui:bg-tooltip pui:p-4 pui:text-label-mini pui:text-inverse-foreground pui:shadow-32 pui:has-data-[slot=kbd]:pr-4 pui:data-[side=bottom]:slide-in-from-top-2 pui:data-[side=inline-end]:slide-in-from-left-2 pui:data-[side=inline-start]:slide-in-from-right-2 pui:data-[side=left]:slide-in-from-right-2 pui:data-[side=right]:slide-in-from-left-2 pui:data-[side=top]:slide-in-from-bottom-2 pui:**:data-[slot=kbd]:relative pui:**:data-[slot=kbd]:isolate pui:**:data-[slot=kbd]:z-50 pui:**:data-[slot=kbd]:rounded-sm pui:data-[state=delayed-open]:animate-in pui:data-[state=delayed-open]:fade-in-0 pui:data-[state=delayed-open]:zoom-in-95 pui:data-open:animate-in pui:data-open:fade-in-0 pui:data-open:zoom-in-95 pui:data-closed:animate-out pui:data-closed:fade-out-0 pui:data-closed:zoom-out-95 pui:motion-reduce:animate-none pui:motion-reduce:transition-none pui:forced-colors:border pui:forced-colors:border-[CanvasText] pui:forced-colors:bg-[Canvas] pui:forced-colors:text-[CanvasText] pui:forced-colors:shadow-none",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            data-slot="tooltip-arrow"
            className={cn(
              "pui:z-50",
              isVerticalSide
                ? "pui:h-4 pui:w-6 pui:data-[side=bottom]:bottom-full pui:data-[side=top]:top-full"
                : "pui:size-2.5 pui:translate-y-[calc(-50%-var(--pui-hairline))] pui:rotate-45 pui:rounded-2 pui:bg-tooltip pui:fill-tooltip pui:data-[side=bottom]:top-1 pui:data-[side=inline-end]:top-1/2! pui:data-[side=inline-end]:-left-1 pui:data-[side=inline-end]:-translate-y-1/2 pui:data-[side=inline-start]:top-1/2! pui:data-[side=inline-start]:-right-1 pui:data-[side=inline-start]:-translate-y-1/2 pui:data-[side=left]:top-1/2! pui:data-[side=left]:-right-1 pui:data-[side=left]:-translate-y-1/2 pui:data-[side=right]:top-1/2! pui:data-[side=right]:-left-1 pui:data-[side=right]:-translate-y-1/2 pui:data-[side=top]:-bottom-2.5 pui:forced-colors:bg-[Canvas]",
            )}
          >
            {isVerticalSide ? (
              <svg
                aria-hidden="true"
                className="pui:block pui:size-full pui:overflow-visible"
                viewBox="0 0 24 16"
              >
                <path
                  className="pui:fill-tooltip pui:forced-colors:forced-color-adjust-none pui:forced-colors:fill-[Canvas]"
                  d={side === "top" ? arrowDirectionBottomPath : arrowDirectionTopPath}
                />
              </svg>
            ) : null}
          </TooltipPrimitive.Arrow>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
