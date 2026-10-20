import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

type TagStatus = "default" | "info" | "warning" | "success" | "error" | "counter"

const statusIcons: Record<Exclude<TagStatus, "counter">, React.ReactElement> = {
  default: <PagoPAIcon name="kid_star" size={16} className="text-primary" />,
  info: <PagoPAIcon name="info" filled size={16} className="text-info" />,
  warning: <PagoPAIcon name="warning" size={16} className="text-warning" />,
  success: <PagoPAIcon name="check_circle" size={16} className="text-success" />,
  error: <PagoPAIcon name="report" size={16} className="text-destructive" />,
}

function Tag({
  status = "default",
  icon,
  children,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  /** Source status; `counter` renders a numeric count without an icon. */
  status?: TagStatus
  /** Optional caller icon replacing the status artwork. */
  icon?: React.ReactNode
}) {
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
      {status === "counter" ? null : (icon ?? statusIcons[status])}
      <span data-slot="tag-label">{children}</span>
    </span>
  )
}

export { Tag, type TagStatus }
