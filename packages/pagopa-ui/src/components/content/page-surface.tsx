import * as React from "react"
import { cn } from "@/lib/cn"

/** Props of the page surface; every `section` attribute passes through. */
export type PageSurfaceProps = React.ComponentProps<"section">

/**
 * Page surface: the full-width background a page body sits on, growing with its
 * content.
 *
 * Figma: White Template (node 50:1700)
 */
function PageSurface({ className, ...props }: PageSurfaceProps) {
  return (
    <section
      data-slot="page-surface"
      className={cn(
        "pui:min-h-(--pui-artboard-height) pui:bg-background pui:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export { PageSurface }
