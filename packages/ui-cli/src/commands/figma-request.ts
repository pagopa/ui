import { defineCommand } from "citty"
import path from "node:path"
import {
  closeDesignRequest,
  listDesignRequests,
  openDesignRequest,
} from "../figma/design-requests.ts"
import { UsageError } from "../lib/command.ts"
import { requireText } from "./args.ts"
import { action, EXIT, printJson, type CliContext } from "./context.ts"

const stringArg = { type: "string" } as const
const boolArg = { type: "boolean", default: false } as const

export function requestCommand(ctx: CliContext) {
  const open = defineCommand({
    meta: { name: "open", description: "Open a design-owner request and write its record" },
    args: { input: { ...stringArg, required: true }, "dry-run": boolArg, json: boolArg },
    run: action(ctx, ({ input, "dry-run": dryRun, json }) => {
      const report = openDesignRequest(
        ctx.workspace(),
        path.resolve(ctx.cwd, input),
        ctx.now().toISOString().slice(0, 10),
        dryRun,
        (args, cwd) => ctx.external.gh(args, cwd),
      )
      if (json) printJson(ctx.io, report)
      else {
        ctx.io.out(
          `${report.dryRun ? "would open" : "opened"}: ${report.path}${report.issueUrl ? ` · ${report.issueUrl}` : ""}`,
        )
        for (const planned of report.actions) ctx.io.out(`  ${planned}`)
      }
      return EXIT.ok
    }),
  })
  const list = defineCommand({
    meta: { name: "list", description: "List design requests waiting for or with an answer" },
    args: { answered: boolArg, waiting: boolArg, json: boolArg },
    run: action(ctx, ({ answered, waiting, json }) => {
      if (answered && waiting) throw new UsageError("choose --answered or --waiting")
      const state = answered ? "answered" : "waiting"
      const result = listDesignRequests(ctx.workspace(), state, (args, cwd) =>
        ctx.external.gh(args, cwd),
      )
      if (json) printJson(ctx.io, result)
      else if (Array.isArray(result)) {
        for (const value of result) {
          if (typeof value === "object" && value !== null) {
            const item = Object.fromEntries(Object.entries(value))
            ctx.io.out(
              `${String(item.number ?? "?")} ${String(item.title ?? "")} ${String(item.url ?? "")}`.trim(),
            )
          }
        }
      }
      return EXIT.ok
    }),
  })
  const close = defineCommand({
    meta: {
      name: "close",
      description: "Record an answer, comment the commit and close the issue",
    },
    args: {
      record: { type: "positional", required: true },
      decision: stringArg,
      commit: stringArg,
      "dry-run": boolArg,
      json: boolArg,
    },
    run: action(ctx, ({ record, decision, commit, "dry-run": dryRun, json }) => {
      const report = closeDesignRequest(
        ctx.workspace(),
        record,
        requireText(decision, "--decision", "figma request close"),
        requireText(commit, "--commit", "figma request close"),
        dryRun,
        (args, cwd) => ctx.external.gh(args, cwd),
      )
      if (json) printJson(ctx.io, report)
      else {
        ctx.io.out(`${report.dryRun ? "would close" : "closed"}: ${report.issueUrl}`)
        for (const planned of report.actions) ctx.io.out(`  ${planned}`)
        for (const point of report.openPoints) ctx.io.err(`open: ${point}`)
      }
      return EXIT.ok
    }),
  })
  return defineCommand({ meta: { name: "request" }, subCommands: { open, list, close } })
}
