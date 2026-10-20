// Shared tone vocabulary of the feedback components (internal module, not
// re-exported by the family barrel).
/**
 * Semantic tone of the feedback surfaces: it selects the source colors and,
 * on the live regions, the announcing role (`error` announces as `alert`,
 * every other tone as `status`).
 */
export type Tone = "info" | "success" | "warning" | "error"

export const toneStyles: Record<Tone, string> = {
  info: "border-info-border bg-info-soft text-info-foreground",
  success: "border-success-border bg-success-soft text-success-foreground",
  warning: "border-warning-border bg-warning-soft text-warning-foreground",
  error: "border-error-border bg-error-soft text-error-foreground",
}
