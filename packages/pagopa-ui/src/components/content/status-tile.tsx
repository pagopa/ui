import * as React from "react"
import { cn } from "@/lib/cn"

function StatusTile({
  channel,
  title,
  tag,
  orientation = "horizontal",
  children,
  className,
  ...props
}: React.ComponentProps<"article"> & {
  /** Optional channel artwork (source Channel-Wrapper). */
  channel?: React.ReactNode
  title: React.ReactNode
  tag?: React.ReactNode
  orientation?: "horizontal" | "vertical"
  children?: React.ReactNode
}) {
  return (
    <article className={cn("grid gap-2 rounded-lg border bg-background p-4", className)} {...props}>
      <div
        className={cn(
          "flex gap-2",
          orientation === "vertical"
            ? "flex-col items-start"
            : "flex-wrap items-center justify-between",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {channel ? (
            <span aria-hidden="true" className="shrink-0 [&>svg]:size-6">
              {channel}
            </span>
          ) : null}
          <span className="text-label-sb text-foreground">{title}</span>
        </span>
        {tag}
      </div>
      {children ? (
        <p className="text-label-mini text-muted-foreground break-words">{children}</p>
      ) : null}
    </article>
  )
}

export { StatusTile }
