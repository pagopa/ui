import { defineCommand, type CommandDef } from "citty"
import { testingAdapters } from "../adapters/testing.ts"
import { UsageError } from "../lib/command.ts"
import { runChanged } from "../testing/changed.ts"
import { runVisual } from "../testing/visual.ts"
import { text } from "./args.ts"
import { action, type CliContext } from "./context.ts"
import { booleanArg, stringArg } from "./parity-args.ts"
import { printParity } from "./parity.ts"

function changedCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "changed", description: "Run only the tests affected since the last pass" },
    args: { coverage: booleanArg, all: booleanArg, since: stringArg },
    run: action(ctx, (args) =>
      printParity(
        ctx,
        runChanged(
          ctx.workspace(),
          {
            coverage: args.coverage,
            all: args.all,
            since: text(args.since),
            passthrough: changedPassthrough(args),
          },
          testingAdapters(ctx.env),
        ),
      ),
    ),
  })
}
function visualCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "visual", description: "Scope visual regression to the change" },
    args: {
      since: stringArg,
      all: booleanArg,
      index: stringArg,
      out: stringArg,
      json: booleanArg,
      "check-baselines": booleanArg,
    },
    run: action(ctx, (args) =>
      printParity(
        ctx,
        runVisual(
          ctx.workspace(),
          {
            since: text(args.since),
            all: args.all,
            index: text(args.index),
            out: text(args.out),
            json: args.json,
            checkBaselines: args["check-baselines"],
          },
          testingAdapters(ctx.env),
        ),
      ),
    ),
  })
}
export function testCommands(ctx: CliContext): CommandDef {
  return defineCommand({
    meta: { name: "test", description: "Test-runner commands" },
    subCommands: { changed: changedCommand(ctx), visual: visualCommand(ctx) },
  })
}

function changedPassthrough(args: { _: string[]; [key: string]: unknown }): string[] {
  const unknown = Object.keys(args).find(
    (name) => !["_", "since", "all", "coverage"].includes(name),
  )
  if (unknown) throw new UsageError(`unknown option --${unknown}: pass Vitest arguments after --`)
  if (args.since === "" || args._.includes("--since"))
    throw new UsageError("--since needs a git ref")
  return args._
}
