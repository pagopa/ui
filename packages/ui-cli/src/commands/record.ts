import { defineCommand } from "citty"

import { record } from "../figma/record.ts"
import { boolArg, stringArg } from "./args.ts"
import { action, printJson, type CliContext } from "./context.ts"

function printRecord(ctx: CliContext, result: Awaited<ReturnType<typeof record>>): void {
  // A run that changed nothing says `unchanged`, and the documents decide it:
  // a prop map alone can change while the status it is recorded beside does not,
  // and a status comparison would call that write a no-op.
  const outcome = result.dryRun ? "dry run" : result.artifacts.length ? "updated" : "unchanged"
  ctx.io.out(
    `${outcome}: ${result.nodeId} ${result.before?.status ?? "unmapped"} → ${result.entry.status}`,
  )
  for (const warning of result.warnings) ctx.io.err(`warn: ${warning}`)
  if (result.dryRun) return
  for (const file of result.artifacts) ctx.io.out(`  wrote ${file}`)
  for (const line of [...result.catalogue.out, ...result.catalogue.err]
    .flatMap((item) => item.split("\n"))
    .filter((item) => item.includes(result.nodeId)))
    ctx.io.out(line)
  for (const residue of result.residues) ctx.io.err(`stale: ${residue}`)
  ctx.io.out(
    `catalogue: ${result.catalogue.exitCode === 0 ? "pass" : "fail"} (${result.catalogue.exitCode})`,
  )
}

export function recordCommand(ctx: CliContext) {
  return defineCommand({
    meta: {
      name: "record",
      description: "Apply one node's registry, map and catalogue updates atomically",
    },
    args: {
      node: { type: "positional", required: true, description: "The Figma node to record" },
      status: { ...stringArg, required: true },
      module: stringArg,
      export: stringArg,
      story: stringArg,
      "story-exports": stringArg,
      note: stringArg,
      reason: stringArg,
      props: {
        ...stringArg,
        description: "The Figma property → prop mapping, as JSON keyed by property name",
      },
      "dry-run": boolArg,
      json: boolArg,
    },
    run: action(ctx, async (args) => {
      const result = await record(ctx.workspace(), {
        nodeId: args.node,
        status: args.status,
        module: args.module,
        export: args.export,
        story: args.story,
        storyExports: args["story-exports"],
        note: args.note,
        reason: args.reason,
        props: args.props,
        dryRun: args["dry-run"],
      })
      if (args.json) printJson(ctx.io, result)
      else printRecord(ctx, result)
      return result.exitCode
    }),
  })
}
