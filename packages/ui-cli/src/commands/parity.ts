import { defineCommand, type CommandDef, type ParsedArgs } from "citty"
import { figmaImages, now } from "../adapters/figma-images.ts"
import { capture, storybookAnswers } from "../adapters/storybook.ts"
import { alignEvaluator } from "../parity/align-evaluator.ts"
import { align } from "../parity/align.ts"
import { captureWave } from "../parity/capture.ts"
import { check } from "../parity/check.ts"
import type { ParityOutput } from "../parity/output.ts"
import { cases } from "../parity/proposals.ts"
import { queue } from "../parity/queue.ts"
import { readSource } from "../parity/read-source.ts"
import { DEFAULT_ROOT, formatProbeTree } from "../parity/render.ts"
import { report } from "../parity/report.ts"
import { integer, requireText, text } from "./args.ts"
import { action, printLines, type CliContext } from "./context.ts"
import { booleanArg, caseArgs, caseOptions, stringArg } from "./parity-args.ts"

export function printParity(ctx: CliContext, result: ParityOutput): number {
  printLines(ctx.io, result)
  return result.code
}
function captureAdapter(ctx: CliContext) {
  return (options: Parameters<typeof capture>[0]) =>
    capture({ ...options, baseUrl: ctx.env.STORYBOOK_URL })
}
function queueCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "queue", description: "Work list of registry cases" },
    args: {
      status: stringArg,
      node: stringArg,
      cases: stringArg,
      order: stringArg,
      unmapped: booleanArg,
      coverage: booleanArg,
      uncovered: booleanArg,
      json: booleanArg,
      next: booleanArg,
      size: stringArg,
    },
    run: action(ctx, (args) =>
      printParity(
        ctx,
        queue(ctx.workspace(), {
          status: text(args.status),
          nodeId: text(args.node),
          casesFile: text(args.cases),
          order: text(args.order),
          unmapped: args.unmapped,
          coverage: args.coverage,
          uncovered: args.uncovered,
          json: args.json,
          next: args.next,
          size: integer(args.size, "--size"),
        }),
      ),
    ),
  })
}
function checkCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "check", description: "Compare a reviewed case" },
    args: caseArgs,
    run: async (input) =>
      action<ParsedArgs<typeof caseArgs>>(ctx, (args) =>
        check(ctx.workspace(), caseOptions(args, input.rawArgs), {
          capture: captureAdapter(ctx),
        }).then((result) => printParity(ctx, result)),
      )(input),
  })
}
function alignCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "align", description: "One node's read-only work order" },
    args: { node: stringArg, cases: stringArg, json: booleanArg },
    run: action(ctx, async (args) => {
      const workspace = ctx.workspace()
      return printParity(
        ctx,
        await align(
          workspace,
          {
            nodeId: requireText(args.node, "--node", "align"),
            casesFile: text(args.cases),
            json: args.json,
          },
          {
            evaluate: alignEvaluator(workspace, captureAdapter(ctx)),
            storybook: () => storybookAnswers(ctx.env.STORYBOOK_URL),
            baseUrl: ctx.env.STORYBOOK_URL,
          },
        ),
      )
    }),
  })
}
function captureCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "capture", description: "Run a parity wave" },
    args: {
      cases: stringArg,
      saved: booleanArg,
      input: stringArg,
      status: stringArg,
      node: stringArg,
      device: stringArg,
      note: stringArg,
      limit: stringArg,
      "include-catalogue": booleanArg,
      out: stringArg,
      strict: booleanArg,
      "dry-run": booleanArg,
      wave: stringArg,
    },
    run: action(ctx, async (args) =>
      printParity(
        ctx,
        await captureWave(
          ctx.workspace(),
          {
            casesFile: text(args.cases),
            saved: args.saved,
            nodeId: text(args.node),
            input: text(args.input),
            status: text(args.status),
            device: text(args.device),
            note: text(args.note),
            limit: integer(args.limit, "--limit"),
            includeCatalogue: args["include-catalogue"],
            outDir: text(args.out),
            strict: args.strict,
            dryRun: args["dry-run"],
            wave: text(args.wave),
          },
          {
            evaluate: (spec, input) =>
              import("../parity/evaluate.ts").then(({ evaluateCase }) =>
                evaluateCase(ctx.workspace(), spec, { ...input, capture: captureAdapter(ctx) }),
              ),
            now,
          },
        ),
      ),
    ),
  })
}
function sourceCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "source", description: "Print the pinned source spec" },
    args: {
      nodeId: { type: "positional", required: true },
      input: stringArg,
      depth: stringArg,
      json: booleanArg,
      compact: booleanArg,
      png: booleanArg,
    },
    run: action(ctx, async (args) =>
      printParity(
        ctx,
        await readSource(
          ctx.workspace(),
          {
            nodeId: args.nodeId,
            input: text(args.input),
            depth: integer(args.depth, "--depth"),
            json: args.json,
            compact: args.compact,
            png: args.png ? (args._[1] ?? true) : undefined,
          },
          figmaImages(ctx.env),
        ),
      ),
    ),
  })
}
function renderCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "render", description: "Probe one Storybook story" },
    args: { ...caseArgs, tree: booleanArg },
    run: async (input) =>
      action<ParsedArgs<typeof caseArgs> & { tree?: boolean }>(ctx, async (args) => {
        const options = caseOptions(args, input.rawArgs)
        const storyId = requireText(args.story, "--story", "render")
        const probe = await captureAdapter(ctx)({
          storyId,
          rootWidth: options.width ?? 274,
          viewport: options.viewport,
          viewportHeight: options.height,
          rootSelector: options.root ?? DEFAULT_ROOT,
          subjects: options.subjects ?? { field: DEFAULT_ROOT },
          offsetOrigin: options.offsetOrigin,
          fill: options.fill,
          click: options.click,
          focus: options.focus,
          blur: options.blur,
          keepFocus: options.keepFocus,
          expectState: options.expectState,
          stateEvidence: options.stateEvidence,
          screenshot: options.screenshot ? ctx.workspace().path(options.screenshot) : undefined,
          tree: args.tree
            ? { selector: options.root ?? DEFAULT_ROOT, depth: options.depth ?? 4 }
            : undefined,
        })
        ctx.io.out(
          args.tree
            ? formatProbeTree(Array.isArray(probe.tree) ? probe.tree : [])
            : JSON.stringify(probe, null, 2),
        )
        return 0
      })(input),
  })
}
function reportCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "report", description: "Aggregate a wave directory" },
    args: { wave: stringArg, dir: stringArg, out: stringArg },
    run: action(ctx, (args) =>
      printParity(
        ctx,
        report(ctx.workspace(), {
          wave: text(args.wave),
          dir: text(args.dir),
          outDir: text(args.out),
        }),
      ),
    ),
  })
}
function casesCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "cases", description: "Propose missing device cases" },
    args: { sync: booleanArg, node: stringArg, "dry-run": booleanArg, cases: stringArg },
    run: action(ctx, (args) =>
      printParity(
        ctx,
        cases(ctx.workspace(), {
          nodeId: text(args.node),
          casesFile: text(args.cases),
          dryRun: args["dry-run"],
        }),
      ),
    ),
  })
}
export function parityCommands(ctx: CliContext): CommandDef {
  return defineCommand({
    meta: { name: "parity", description: "Visual-parity commands" },
    subCommands: {
      queue: queueCommand(ctx),
      align: alignCommand(ctx),
      check: checkCommand(ctx),
      capture: captureCommand(ctx),
      report: reportCommand(ctx),
      cases: casesCommand(ctx),
      source: sourceCommand(ctx),
      render: renderCommand(ctx),
    },
  })
}
