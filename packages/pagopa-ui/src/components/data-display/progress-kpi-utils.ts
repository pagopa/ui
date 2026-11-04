// The percentage a KPI bar paints and announces, clamped to the range it
// declares. A total that is zero or unknown has no percentage: the bar reads
// 0%, never NaN, and a negative value cannot break the `aria-valuemin` floor.
export function progressPercentage(value: number, total: number) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)))
}
