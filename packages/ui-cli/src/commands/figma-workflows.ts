import { defineCommand, type CommandDef } from "citty"
import { capture, storybookAnswers } from "../adapters/storybook.ts"
import { gitChanges, runGreenChain } from "../adapters/close-git.ts"
import { checkDocLinks } from "../checks/doc-links.ts"
import { formatCheck, passed } from "../checks/report.ts"
import { formatDeviceReport, readDevices } from "../figma/devices.ts"
import { checkRules, formatRulesCheck } from "../figma/rules-workflow.ts"
import { readRulesSnapshot } from "../figma/rules.ts"
import { syncCatalogue } from "../figma/sync.ts"
import { setRegistry } from "../figma/registry-set.ts"
import { closeWorkflow } from "../figma/close.ts"
import { buildBriefQueue } from "../figma/brief-queue.ts"
import { checkEvidence, formatEvidence } from "../parity/evidence.ts"
import { check } from "../parity/check.ts"
import { UsageError } from "../lib/command.ts"
import { NodeIdSchema } from "../schemas/common.ts"
import { unresolvedCliTokens } from "./resolve.ts"
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

function closeRunner(ctx: CliContext, root: () => CommandDef, json: boolean) {
  const workspace = ctx.workspace()
  return async (step: string): Promise<number | { code: number; details: string[] }> => {
    if (step === "check catalogue") {
      const result = await syncCatalogue(workspace)
      return { code: result.exitCode, details: [...result.out, ...result.err] }
    }
    if (step === "check rules") {
      const result = checkRules(workspace, true)
      return {
        code: result.errors.length ? 1 : 0,
        details: formatRulesCheck(result, Boolean(readRulesSnapshot(workspace.root, false))),
      }
    }
    if (step === "check devices") {
      const result = readDevices(workspace)
      const formatted = formatDeviceReport(result, true)
      return { code: result.errors.length ? 1 : 0, details: [...formatted.out, ...formatted.err] }
    }
    if (step === "check evidence") {
      const result = checkEvidence({ root: workspace.workspaceRoot, dataRoot: workspace.root })
      const formatted = formatEvidence(result)
      return { code: result.errors.length ? 1 : 0, details: [...formatted.out, ...formatted.err] }
    }
    if (step === "check docs") {
      const result = checkDocLinks(workspace, {
        env: ctx.env,
        cliCommand: (tokens) => unresolvedCliTokens(root(), tokens),
      })
      const formatted = formatCheck(result)
      return { code: passed(result) ? 0 : 1, details: [...formatted.out, ...formatted.err] }
    }
    if (step === "pnpm nx run workspace:verify")
      return runGreenChain(workspace, ctx.env, json ? ctx.io.err : ctx.io.out)
    const nodeId = step.split(" ")[3]
    const result = await check(
      workspace,
      { nodeId, saved: true },
      { capture: (options) => capture({ ...options, baseUrl: ctx.env.STORYBOOK_URL }) },
    )
    return { code: result.code, details: [...result.out, ...result.err] }
  }
}

export function closeCommand(ctx: CliContext, root: () => CommandDef) {
  return defineCommand({
    meta: { name: "close", description: "Run the Figma closing sequence" },
    args: { nodes: stringArg, base: stringArg, "skip-chain": boolArg, json: boolArg },
    run: action(ctx, async (args) => {
      if (args.nodes && args.base) throw new UsageError("choose --nodes or --base")
      const workspace = ctx.workspace()
      let changes: ReturnType<typeof gitChanges> | null = null
      try {
        changes = gitChanges(workspace, args.base)
      } catch (error) {
        if (args.base) throw new UsageError(`cannot read base ${args.base}: ${String(error)}`)
      }
      const explicit = args.nodes?.split(",").map((id) => id.trim())
      if (
        explicit &&
        (!explicit.length || explicit.some((id) => !NodeIdSchema.safeParse(id).success))
      )
        throw new UsageError("--nodes requires comma-separated node IDs")
      const changed = changes?.nodes ?? []
      const nodes =
        explicit ?? (changed.length ? changed : buildBriefQueue(workspace).implementationOrder)
      const source = explicit
        ? "explicit"
        : changed.length
          ? `changes vs ${changes?.base}`
          : changes
            ? "pending queue"
            : "pending queue (base unavailable)"
      const result = await closeWorkflow(
        { nodes, source, files: changes?.files ?? [], skipChain: args["skip-chain"] },
        {
          run: closeRunner(ctx, root, args.json),
          storybook: () => storybookAnswers(ctx.env.STORYBOOK_URL),
        },
      )
      if (args.json) printJson(ctx.io, { ...result, report: reportSkeleton(result) })
      else {
        ctx.io.out(`nodes (${source}): ${nodes.join(", ") || "none"}`)
        ctx.io.out("step | result | exit code")
        for (const row of result.steps)
          ctx.io.out(`${row.step} | ${row.result} | ${row.exitCode ?? "—"}`)
        for (const row of result.steps)
          if (row.details?.length && row.result !== "pass")
            ctx.io.err(`${row.step}:\n${row.details.join("\n")}`)
        ctx.io.out(reportSkeleton(result))
      }
      return result.exitCode
    }),
  })
}
function reportSkeleton(result: Awaited<ReturnType<typeof closeWorkflow>>): string {
  return [
    "What changed: <complete>",
    `Per node decision and reason: ${result.nodes.map((id) => `${id}: <complete>`).join("; ") || "<none>"}`,
    "Per device verdict: <complete>",
    "Residues and reasons: <complete>",
    "Open items and why: <complete>",
    `Files touched: ${result.files.join(", ") || "<none>"}`,
    `Commands with results: ${result.steps.map((row) => `${row.step}: ${row.result}`).join("; ")}`,
  ].join("\n")
}
