import * as React from "react"
import { cn } from "@/lib/cn"

import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"
import { Filled as InfoFilledIcon } from "@/components/icons/generated/info"
import { Default as KidStarIcon } from "@/components/icons/generated/kid-star"
import { Default as ReportIcon } from "@/components/icons/generated/report"
import { Default as WarningIcon } from "@/components/icons/generated/warning"
import type { Glyph } from "@/components/icons/icon"

type TagStatus = "default" | "info" | "warning" | "success" | "error" | "counter"

// The status artwork as component references: a tag imports the five status
// glyphs it can render, not the whole pinned set. A published glyph is already
// boxed, so it renders as a component rather than as an `Icon` source.
const statusIcons: Record<Exclude<TagStatus, "counter">, { glyph: Glyph; className: string }> = {
  default: { glyph: KidStarIcon, className: "pui:text-primary" },
  info: { glyph: InfoFilledIcon, className: "pui:text-info" },
  warning: { glyph: WarningIcon, className: "pui:text-warning" },
  success: { glyph: CheckCircleIcon, className: "pui:text-success" },
  error: { glyph: ReportIcon, className: "pui:text-destructive" },
}

export type TagProps = React.ComponentProps<"span"> & {
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
}

function Tag({ status = "default", icon, iconLabel, children, className, ...props }: TagProps) {
  const artwork = status === "counter" ? undefined : statusIcons[status]
  const ArtworkIcon = artwork?.glyph
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
      {artwork && ArtworkIcon
        ? (icon ?? (
            <ArtworkIcon
              size={16}
              className={artwork.className}
              decorative={!iconLabel}
              label={iconLabel ?? ""}
            />
          ))
        : null}
      <span data-slot="tag-label">{children}</span>
    </span>
  )
}

export { Tag, type TagStatus }
