import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

function Skeleton({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="skeleton"
      className={cn(
        "block rounded-full bg-secondary motion-safe:animate-pulse forced-colors:border-2 forced-colors:border-dashed forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:[forced-color-adjust:none]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
