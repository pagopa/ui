// `ui-cli update <artifact>`: rewrite a committed baseline from the current
// tree. Each subcommand prints what it recorded.
import { defineCommand, type CommandDef, type SubCommandsDef } from "citty"
import path from "node:path"

import { updateCssBudget } from "../checks/css-budget.ts"
import { updatePublicTokens } from "../checks/public-tokens.ts"
import { updateTokens } from "../figma/tokens.ts"
import { text } from "./args.ts"
import { budgetArg } from "./check.ts"
import { action, EXIT, type CliContext } from "./context.ts"

export function updateCommands(ctx: CliContext, extra: SubCommandsDef = {}): CommandDef {
  return defineCommand({
    meta: { name: "update", description: "Record a baseline from the current tree" },
    subCommands: {
      tokens: defineCommand({
        meta: { name: "tokens", description: "Curate a pinned Figma variable snapshot" },
        args: {
          input: {
            type: "string",
            required: true,
            valueHint: "file",
            description: "Pinned token snapshot",
          },
        },
        run: action(ctx, ({ input }) => {
          ctx.io.out(updateTokens(ctx.workspace(), path.resolve(ctx.cwd, input)))
          return EXIT.ok
        }),
      }),
      css: defineCommand({
        meta: { name: "css", description: "Record the stylesheet size you accept" },
        args: { budget: budgetArg },
        run: action(ctx, ({ budget }) => {
          ctx.io.out(updateCssBudget(ctx.workspace(), { budgetFile: text(budget) }))
          return EXIT.ok
        }),
      }),
      "public-tokens": defineCommand({
        meta: { name: "public-tokens", description: "Record the public token list you accept" },
        run: action(ctx, async () => {
          ctx.io.out(await updatePublicTokens(ctx.workspace()))
          return EXIT.ok
        }),
      }),
      ...extra,
    },
  })
}
