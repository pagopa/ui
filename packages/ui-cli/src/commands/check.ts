// `ui-cli check <contract>`: the read-only gates. Each subcommand reads its
// flags, calls one domain check and prints its report; a problem exits 1.
import { defineCommand, type CommandDef, type SubCommandsDef } from "citty"

import { checkA11yConformance } from "../checks/a11y-conformance.ts"
import { checkClientDirectives } from "../checks/client-directives.ts"
import { checkCssBudget, measureCss } from "../checks/css-budget.ts"
import { checkDocLinks } from "../checks/doc-links.ts"
import { checkFoundation, measureFoundation } from "../checks/foundation.ts"
import { checkImportLayers } from "../checks/import-layers.ts"
import { checkLibrary } from "../checks/library.ts"
import { checkPublicTokens } from "../checks/public-tokens.ts"
import { formatCheck, passed, type CheckReport } from "../checks/report.ts"
import { checkTextDefaults } from "../checks/text-defaults.ts"
import { integer, text } from "./args.ts"
import { action, EXIT, printJson, printLines, type CliContext } from "./context.ts"
import { unresolvedCliTokens } from "./resolve.ts"

export const budgetArg = {
  type: "string",
  valueHint: "file",
  description: "Budget file to read (default: the tooling's data/css-budget.json)",
} as const

export function printReport(ctx: CliContext, result: CheckReport): number {
  printLines(ctx.io, formatCheck(result))
  return passed(result) ? EXIT.ok : EXIT.failure
}

export function checkCommands(
  ctx: CliContext,
  root: () => CommandDef,
  extra: SubCommandsDef = {},
): CommandDef {
  const gate = (name: string, description: string, run: () => CheckReport | Promise<CheckReport>) =>
    defineCommand({
      meta: { name, description },
      run: action(ctx, async () => printReport(ctx, await run())),
    })

  return defineCommand({
    meta: { name: "check", description: "Run one of the repository contracts" },
    subCommands: {
      a11y: gate("a11y", "Check the accessibility conformance map", () =>
        checkA11yConformance(ctx.workspace()),
      ),
      "client-directives": defineCommand({
        meta: {
          name: "client-directives",
          description: "Check the client boundary of every source module",
        },
        args: {
          report: { type: "boolean", default: false, description: "Print both lists and exit 0" },
        },
        run: action(ctx, ({ report }) =>
          printReport(ctx, checkClientDirectives(ctx.workspace(), { report })),
        ),
      }),
      css: defineCommand({
        meta: { name: "css", description: "Enforce the published stylesheet budget" },
        args: {
          measure: { type: "boolean", default: false, description: "Print the current sizes" },
          budget: budgetArg,
        },
        run: action(ctx, ({ measure, budget }) => {
          if (measure) {
            printJson(ctx.io, measureCss(ctx.workspace()))
            return EXIT.ok
          }
          return printReport(ctx, checkCssBudget(ctx.workspace(), { budgetFile: text(budget) }))
        }),
      }),
      docs: gate("docs", "Resolve documentation links, path claims and commands", () =>
        checkDocLinks(ctx.workspace(), {
          env: ctx.env,
          cliCommand: (tokens) => unresolvedCliTokens(root(), tokens),
        }),
      ),
      foundation: defineCommand({
        meta: { name: "foundation", description: "Enforce the component class contract" },
        args: {
          measure: { type: "boolean", default: false, description: "Print the current counts" },
        },
        run: action(ctx, ({ measure }) => {
          if (measure) {
            printJson(ctx.io, measureFoundation(ctx.workspace()))
            return EXIT.ok
          }
          return printReport(ctx, checkFoundation(ctx.workspace()))
        }),
      }),
      layers: gate("layers", "Enforce the import-layer contract", () =>
        checkImportLayers(ctx.workspace()),
      ),
      library: gate("library", "Verify the packed artifact in an isolated app", () =>
        checkLibrary(ctx.workspace(), { env: ctx.env, log: ctx.io.out }),
      ),
      "public-tokens": gate(
        "public-tokens",
        "Compare the public token list with the generated tokens",
        () => checkPublicTokens(ctx.workspace()),
      ),
      "text-defaults": defineCommand({
        meta: { name: "text-defaults", description: "Reject literal text defaults in components" },
        args: {
          max: {
            type: "string",
            valueHint: "n",
            description: "Exit 1 when the number of literal defaults exceeds n",
          },
        },
        run: action(ctx, ({ max }) =>
          printReport(ctx, checkTextDefaults(ctx.workspace(), { max: integer(max, "--max") })),
        ),
      }),
      ...extra,
    },
  })
}
