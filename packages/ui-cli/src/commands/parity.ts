import { defineCommand, type CommandDef, type ParsedArgs } from "citty"
import { figmaImages } from "../adapters/figma-images.ts"
import { capture } from "../adapters/storybook.ts"
import { check } from "../parity/check.ts"
import type { ParityOutput } from "../parity/output.ts"
import { readSource } from "../parity/read-source.ts"
import { DEFAULT_ROOT, formatProbeTree } from "../parity/render.ts"
import { integer, requireText, text } from "./args.ts"
import { action, printLines, type CliContext } from "./context.ts"
import { booleanArg, caseArgs, caseOptions, stringArg } from "./parity-args.ts"
import { requireToken, requireTokenArg } from "./token.ts"

export function printParity(ctx: CliContext, result: ParityOutput): number {
  printLines(ctx.io, result)
  return result.code
}
function captureAdapter(ctx: CliContext) {
  return (options: Parameters<typeof capture>[0]) =>
    capture({ ...options, baseUrl: ctx.env.STORYBOOK_URL })
}
function checkCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "check", description: "Compare a registry target with its render" },
    args: caseArgs,
    run: async (input) =>
      action<ParsedArgs<typeof caseArgs>>(ctx, (args) =>
        check(ctx.workspace(), caseOptions(args, input.rawArgs), {
          capture: captureAdapter(ctx),
        }).then((result) => printParity(ctx, result)),
      )(input),
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
      "require-token": requireTokenArg,
    },
    run: action(ctx, async (args) => {
      requireToken(ctx, args["require-token"])
      return printParity(
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
      )
    }),
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
export function parityCommands(ctx: CliContext): CommandDef {
  return defineCommand({
    meta: { name: "parity", description: "Ephemeral visual-parity diagnostic" },
    subCommands: {
      check: checkCommand(ctx),
      source: sourceCommand(ctx),
      render: renderCommand(ctx),
    },
  })
}
