import { defineCommand } from "citty"
import path from "node:path"
import { figmaToken } from "../adapters/figma-token.ts"
import { readSurfaceTree, syncPageSurface } from "../figma/surface-sync.ts"
import { UsageError } from "../lib/command.ts"
import { requireText } from "./args.ts"
import { action, EXIT, printJson, printLines, type CliContext } from "./context.ts"
import { requireToken, requireTokenArg } from "./token.ts"

const stringArg = { type: "string" } as const

export function surfaceCommand(ctx: CliContext) {
  const sync = defineCommand({
    meta: { name: "sync", description: "Refresh a page's identity census from its tree" },
    args: {
      page: stringArg,
      input: stringArg,
      rest: { type: "boolean", default: false },
      "require-token": requireTokenArg,
      "dry-run": { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
    run: action(ctx, async (args) => {
      const pageId = requireText(args.page, "--page <pageId>", "figma surface sync")
      if (args.input && args.rest) throw new UsageError("choose either --input <file> or --rest")
      if (!args.input && !args.rest)
        throw new UsageError("figma surface sync needs --input <file> or --rest")
      requireToken(ctx, args["require-token"])
      const token = args.rest ? figmaToken(ctx.env) : undefined
      const tree = await readSurfaceTree(ctx.workspace(), pageId, {
        input: args.input ? path.resolve(ctx.cwd, args.input) : undefined,
        token,
      })
      const result = await syncPageSurface(ctx.workspace(), {
        pageId,
        tree,
        now: ctx.now().toISOString().slice(0, 10),
        dryRun: args["dry-run"],
      })
      if (args.json) {
        printJson(ctx.io, result)
      } else {
        ctx.io.out(
          `${result.dryRun ? "would update" : "updated"}: ${result.page.pageId} ${result.page.pageName}`,
        )
        for (const identity of result.added)
          ctx.io.out(`  + ${identity.nodeId} ${identity.name} (${identity.decision})`)
        for (const identity of result.removed) ctx.io.out(`  - ${identity.nodeId} ${identity.name}`)
        if (!result.added.length && !result.removed.length) ctx.io.out("  identities unchanged")
        printLines(ctx.io, { out: result.check.out, err: result.check.err })
        ctx.io.out(
          `catalogue overall: ${result.check.exitCode === EXIT.ok ? "pass" : "fail"} (${result.check.exitCode})`,
        )
      }
      return result.check.exitCode
    }),
  })
  return defineCommand({ meta: { name: "surface" }, subCommands: { sync } })
}
