import type { DeepPartial, Messages } from "./types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * The caller's override merged over the base, one level per group: a group it
 * sets keeps every key it does not name. The leaves are strings and functions,
 * so the group is the depth that a merge has to walk.
 */
export function mergeMessages(base: Messages, override: DeepPartial<Messages>): Messages {
  const merged: Messages = { ...base }
  for (const [group, patch] of Object.entries(override)) {
    if (patch === undefined) continue
    const current = Reflect.get(merged, group)
    Reflect.set(merged, group, isRecord(current) ? { ...current, ...patch } : patch)
  }
  return merged
}
