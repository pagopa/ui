// Shared tone vocabulary of the feedback components (internal module, not
// re-exported by the family barrel).
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

export const statusIcons = {
  info: "info",
  success: "check_circle",
  warning: "warning",
  error: "report",
} as const
