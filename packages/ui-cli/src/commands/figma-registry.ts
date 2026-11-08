import { defineCommand } from "citty"
import { setRegistry } from "../figma/registry-set.ts"
import { action, printJson, type CliContext } from "./context.ts"

const stringArg = { type: "string" } as const
const boolArg = { type: "boolean", default: false } as const

export function registryCommand(ctx: CliContext) {
  const set = defineCommand({
    meta: { name: "set", description: "Record a catalogue decision" },
    args: {
      node: { type: "positional", required: true },
      status: { ...stringArg, required: true },
      module: stringArg,
      export: stringArg,
      story: stringArg,
      "story-exports": stringArg,
      note: stringArg,
      reason: stringArg,
      "dry-run": boolArg,
      json: boolArg,
    },
    run: action(ctx, async (args) => {
      const report = await setRegistry(ctx.workspace(), {
        nodeId: args.node,
        status: args.status,
        module: args.module,
        export: args.export,
        story: args.story,
        storyExports: args["story-exports"],
        note: args.note,
        reason: args.reason,
        dryRun: args["dry-run"],
      })
      if (args.json) printJson(ctx.io, report)
      else {
        ctx.io.out(
          `${report.dryRun ? "dry run" : "updated"}: ${report.nodeId} ${report.before?.status ?? "unmapped"} → ${report.entry.status}`,
        )
        for (const warning of report.warnings) ctx.io.err(`warn: ${warning}`)
        if (report.dryRun)
          ctx.io.out(
            JSON.stringify(
              {
                before: report.before,
                after: report.entry,
                surface: report.surface,
                baseline: report.baseline,
              },
              null,
              2,
            ),
          )
        for (const line of [...(report.check?.out ?? []), ...(report.check?.err ?? [])]
          .flatMap((item) => item.split("\n"))
          .filter((item) => item.includes(report.nodeId)))
          ctx.io.out(line)
        if (report.check)
          ctx.io.out(
            `catalogue overall: ${report.check.exitCode === 0 ? "pass" : "fail"} (${report.check.exitCode})`,
          )
      }
      return report.exitCode
    }),
  })
  return defineCommand({ meta: { name: "registry" }, subCommands: { set } })
}
