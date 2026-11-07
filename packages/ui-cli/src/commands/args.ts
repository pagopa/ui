// Shared argument shapes, and the one sanctioned read of the raw arguments.
import { parseArgs } from "node:util"

import { UsageError } from "../lib/command.ts"

export const jsonArg = {
  type: "boolean",
  default: false,
  description: "Print machine-readable JSON",
} as const

export const inputArg = {
  type: "string",
  valueHint: "file",
  description: "Path to the pinned snapshot the command reads",
} as const

// citty 0.2 keeps only the last value of a repeated flag. The parity commands
// take `--click a --click b`, so they read every value of those names here.
export function repeated(rawArgs: readonly string[], name: string): string[] {
  const { values } = parseArgs({
    args: [...rawArgs],
    options: { [name]: { type: "string", multiple: true } },
    strict: false,
    allowPositionals: true,
  })
  const value = values[name]
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string")
  return typeof value === "string" ? [value] : []
}

export function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

export function requireText(value: unknown, flag: string, command: string): string {
  const result = text(value)
  if (!result) throw new UsageError(`${command} needs ${flag}`)
  return result
}

export function integer(value: unknown, flag: string): number | undefined {
  const raw = text(value)
  if (raw === undefined) return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed)) throw new UsageError(`${flag} must be an integer, got "${raw}"`)
  return parsed
}
