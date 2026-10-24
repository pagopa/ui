import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

type TagStatus = "default" | "info" | "warning" | "success" | "error" | "counter"

const statusIcons: Record<
  Exclude<TagStatus, "counter">,
  { name: React.ComponentProps<typeof PagoPAIcon>["name"]; filled?: boolean; className: string }
> = {
  default: { name: "kid_star", className: "text-primary" },
  info: { name: "info", filled: true, className: "text-info" },
  warning: { name: "warning", className: "text-warning" },
  success: { name: "check_circle", className: "text-success" },
  error: { name: "report", className: "text-destructive" },
}

function Tag({
  status = "default",
  icon,
  iconLabel,
  children,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  /** Source status; `counter` renders a numeric count without an icon. */
  status?: TagStatus
  /** Optional caller icon replacing the status artwork. */
  icon?: React.ReactNode
  /**
   * Accessible name of the default status artwork. When omitted the artwork is
   * decorative, as in the source. The thread suggests `Stato: informativo`,
   * `Stato: avviso`, `Stato confermato`, `Stato: errore` and `Stato: standard`;
   * the caller owns the language.
   */
  iconLabel?: string
}) {
  const artwork = status === "counter" ? undefined : statusIcons[status]
  return (
    <span
      {...props}
      data-slot="tag"
      data-status={status}
      className={cn(
        "inline-flex min-h-8 w-fit items-center gap-1.5 rounded-md border border-border bg-background px-2 text-caption-sb text-muted-foreground uppercase",
        className,
      )}
    >
      {artwork
        ? (icon ?? (
            <PagoPAIcon
              name={artwork.name}
              filled={artwork.filled}
              size={16}
              className={artwork.className}
              decorative={!iconLabel}
              label={iconLabel}
            />
          ))
        : null}
      <span data-slot="tag-label">{children}</span>
    </span>
  )
}

export { Tag, type TagStatus }
