import { figmaToken } from "../adapters/figma-token.ts"
import { UsageError } from "../lib/command.ts"
import type { CliContext } from "./context.ts"

export const requireTokenArg = {
  type: "boolean",
  default: false,
  description: "Require a readable Figma token",
} as const

export function requireToken(ctx: CliContext, required: boolean): void {
  if (!required) return
  try {
    figmaToken(ctx.env)
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error))
  }
}
