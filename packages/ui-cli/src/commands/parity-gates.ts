import { defineCommand } from "citty"
import { figmaImages, now } from "../adapters/figma-images.ts"
import { checkEvidence, formatEvidence, writeEvidence } from "../parity/evidence.ts"
import { verify } from "../parity/verify.ts"
import { text } from "./args.ts"
import { action, printLines, type CliContext } from "./context.ts"
import { booleanArg, stringArg } from "./parity-args.ts"
import { printParity } from "./parity.ts"
import { requireToken, requireTokenArg } from "./token.ts"

export function parityGate(ctx: CliContext) {
  return defineCommand({
    meta: { name: "parity", description: "Verify the case corpus and device coverage" },
    args: { cases: stringArg, json: booleanArg },
    run: action(ctx, (args) =>
      printParity(ctx, verify(ctx.workspace(), { casesFile: text(args.cases), json: args.json })),
    ),
  })
}
export function evidenceGate(ctx: CliContext) {
  return defineCommand({
    meta: { name: "evidence", description: "Check the offline evidence bundle" },
    run: action(ctx, () => {
      const workspace = ctx.workspace()
      const result = checkEvidence({ root: workspace.workspaceRoot, dataRoot: workspace.root })
      printLines(ctx.io, formatEvidence(result))
      return result.errors.length ? 1 : 0
    }),
  })
}
export function evidenceUpdate(ctx: CliContext) {
  return defineCommand({
    meta: { name: "evidence", description: "Write the offline evidence bundle" },
    args: { input: stringArg, "require-token": requireTokenArg },
    run: action(ctx, async (args) => {
      requireToken(ctx, args["require-token"])
      return printParity(
        ctx,
        await writeEvidence(ctx.workspace(), {
          input: text(args.input),
          capturedAt: now().toISOString().slice(0, 10),
          images: figmaImages(ctx.env),
        }),
      )
    }),
  })
}
