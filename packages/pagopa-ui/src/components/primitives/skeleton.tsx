import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

function Skeleton({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "pui:block pui:rounded-full pui:bg-secondary pui:motion-safe:animate-pulse pui:forced-colors:border-2 pui:forced-colors:border-dashed pui:forced-colors:border-[CanvasText] pui:forced-colors:bg-[Canvas] pui:forced-colors:[forced-color-adjust:none]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
