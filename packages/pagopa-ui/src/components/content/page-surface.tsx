import * as React from "react"
import { cn } from "@/lib/cn"

/**
 * Page surface: the full-width background a page body sits on, growing with its
 * content.
 *
 * Figma: White Template (node 50:1700)
 */
export type PageSurfaceProps = React.ComponentProps<"section">

function PageSurface({ className, ...props }: PageSurfaceProps) {
  return (
    <section
      data-slot="white-template"
      className={cn("min-h-(--pui-artboard-height) bg-background text-foreground", className)}
      {...props}
    />
  )
}

export { PageSurface }
