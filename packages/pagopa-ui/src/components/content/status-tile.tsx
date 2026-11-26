import * as React from "react"
import { cn } from "@/lib/cn"

export type StatusTileProps = React.ComponentProps<"article"> & {
  /** Optional channel artwork (source Channel-Wrapper). */
  channel?: React.ReactNode
  title: React.ReactNode
  tag?: React.ReactNode
  orientation?: "horizontal" | "vertical"
  children?: React.ReactNode
}

function StatusTile({
  channel,
  title,
  tag,
  orientation = "horizontal",
  children,
  className,
  ...props
}: StatusTileProps) {
  return (
    <article
      data-slot="status-tile"
      className={cn(
        "pui:grid pui:gap-2 pui:rounded-lg pui:bg-background pui:p-4 pui:ring-1 pui:ring-inset pui:ring-border pui:forced-colors:ring-0 pui:forced-colors:outline-1 pui:forced-colors:outline-solid pui:forced-colors:outline-[CanvasText]",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "pui:flex pui:gap-2",
          orientation === "vertical"
            ? "pui:flex-col pui:items-start"
            : "pui:flex-wrap pui:items-center pui:justify-between",
        )}
      >
        <span className="pui:flex pui:min-w-0 pui:items-center pui:gap-2">
          {channel ? (
            <span aria-hidden="true" className="pui:flex pui:shrink-0 pui:[&>svg]:size-6">
              {channel}
            </span>
          ) : null}
          <span className="pui:text-label-sb pui:text-foreground">{title}</span>
        </span>
        {tag}
      </div>
      {children ? (
        <p className="pui:text-label-mini pui:text-muted-foreground pui:break-words">{children}</p>
      ) : null}
    </article>
  )
}

export { StatusTile }
