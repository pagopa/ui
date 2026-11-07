// Legacy groups retained until their dedicated domain migrations.
import { defineCommand } from "citty"

import { runBrief } from "../figma/brief.ts"
import { runComments } from "../figma/comments.ts"
import { runRules } from "../figma/rules.ts"
import { exitCodeOf } from "../lib/command.ts"
import type { CliContext } from "./context.ts"

function execute(ctx: CliContext, command: () => number | Promise<number>) {
  return async (): Promise<void> => {
    try {
      ctx.exitCode = await command()
    } catch (error) {
      ctx.io.err(`error: ${error instanceof Error ? error.message : String(error)}`)
      if (ctx.env.DEBUG && error instanceof Error && error.stack) ctx.io.err(error.stack)
      ctx.exitCode = exitCodeOf(error)
    }
  }
}

function rawArguments(command: string): string[] {
  const raw = process.argv.slice(2)
  const index = raw.indexOf(command)
  return index >= 0 ? raw.slice(index + 1) : []
}

export function legacyChecks(_ctx: CliContext): Record<string, never> {
  return {}
}

export function legacyFigmaSubCommands(ctx: CliContext) {
  const figmaRules = defineCommand({
    meta: { name: "rules", description: "Read, record and check the component rules boxes" },
    run: execute(ctx, () => runRules(rawArguments("rules"))),
  })

  const figmaComments = defineCommand({
    meta: { name: "comments", description: "Read the node comments of the file" },
    run: execute(ctx, () => runComments(rawArguments("comments"))),
  })

  const figmaBrief = defineCommand({
    meta: { name: "brief", description: "Print the implementation brief of a node" },
    run: execute(ctx, () => runBrief(rawArguments("brief"))),
  })

  return {
    rules: figmaRules,
    comments: figmaComments,
    brief: figmaBrief,
  }
}

export function legacy(_ctx: CliContext): Record<string, never> {
  return {}
}
