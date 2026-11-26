import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

type TagStatus = "default" | "info" | "warning" | "success" | "error" | "counter"

const statusIcons: Record<
  Exclude<TagStatus, "counter">,
  { name: React.ComponentProps<typeof PagoPAIcon>["name"]; filled?: boolean; className: string }
> = {
  default: { name: "kid_star", className: "pui:text-primary" },
  info: { name: "info", filled: true, className: "pui:text-info" },
  warning: { name: "warning", className: "pui:text-warning" },
  success: { name: "check_circle", className: "pui:text-success" },
  error: { name: "report", className: "pui:text-destructive" },
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
        "pui:inline-flex pui:min-h-8 pui:w-fit pui:items-center pui:gap-1.5 pui:rounded-md pui:border pui:border-border pui:bg-background pui:px-2 pui:text-caption-sb pui:text-muted-foreground pui:uppercase",
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
