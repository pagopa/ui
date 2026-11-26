import { defineCommand, type ParsedArgs } from "citty"

import { align } from "../figma/align.ts"
import { action, printJson, type CliContext } from "./context.ts"
import { caseArgs, caseOptions } from "./parity-args.ts"

export function alignCommand(ctx: CliContext) {
  return defineCommand({
    meta: {
      name: "align",
      description: "Preflight, capture and diagnose one node in a single run",
    },
    args: {
      ...caseArgs,
      node: {
        type: "positional",
        required: true,
        description: "The Figma node to align",
      },
    },
    run: async (input) =>
      action<ParsedArgs<typeof caseArgs>>(ctx, async (args) => {
        const options = caseOptions(args, input.rawArgs)
        const result = await align(ctx.workspace(), options, {
          storybookUrl: ctx.env.STORYBOOK_URL,
        })
        if (options.json)
          printJson(ctx.io, { plan: result.plan, diagnostic: result.diagnostic.data })
        else {
          for (const line of result.out) ctx.io.out(line)
          for (const line of result.err) ctx.io.err(line)
        }
        return result.code
      })(input),
  })
}
