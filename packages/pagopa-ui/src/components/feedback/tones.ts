// Shared tone vocabulary of the feedback components (internal module, not
// re-exported by the family barrel).
import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"
import { Filled as InfoFilledIcon } from "@/components/icons/generated/info"
import { Default as ReportIcon } from "@/components/icons/generated/report"
import { Default as WarningIcon } from "@/components/icons/generated/warning"
import type { Glyph } from "@/components/icons/icon"

/**
 * Semantic tone of the feedback surfaces: it selects the source colors and,
 * on the live regions, the announcing role (`error` announces as `alert`,
 * every other tone as `status`).
 */
export type Tone = "info" | "success" | "warning" | "error"

export const toneStyles: Record<Tone, string> = {
  info: "pui:border-info-border pui:bg-info-soft pui:text-info-foreground",
  success: "pui:border-success-border pui:bg-success-soft pui:text-success-foreground",
  warning: "pui:border-warning-border pui:bg-warning-soft pui:text-warning-foreground",
  error: "pui:border-error-border pui:bg-error-soft pui:text-error-foreground",
}

// One glyph per tone as a component reference: a live region that renders the
// four tones imports four icons, not the whole pinned set. Each value is a
// published glyph, so it renders as a component, never as an `Icon` source.
export const statusIcons: Record<Tone, Glyph> = {
  info: InfoFilledIcon,
  success: CheckCircleIcon,
  warning: WarningIcon,
  error: ReportIcon,
}
