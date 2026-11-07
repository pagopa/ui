import { defineCommand, type CommandDef, type SubCommandsDef } from "citty"
import path from "node:path"

import { checkIcons, updateIcons } from "../figma/icons.ts"
import { exportFigma } from "../figma/export.ts"
import { checkPictograms, exportPictograms, updatePictograms } from "../figma/pictograms.ts"
import { checkArtwork } from "../figma/artwork.ts"
import { legacyFigmaSubCommands } from "./legacy.ts"
import { action, EXIT, printLines, type CliContext } from "./context.ts"
import { formatCheck, passed } from "../checks/report.ts"

const inputArg = {
  type: "string",
  valueHint: "file",
  description: "Pinned Figma snapshot to read",
} as const

export function artworkCheckCommands(ctx: CliContext): SubCommandsDef {
  const checkIcon = defineCommand({
    meta: { name: "icons", description: "Validate committed icon artwork and provenance" },
    args: { input: inputArg },
    run: action(ctx, async ({ input }) => {
      const result = await checkIcons(ctx.workspace(), {
        input: input ? path.resolve(ctx.cwd, input) : undefined,
      })
      printLines(ctx.io, formatCheck(result))
      return passed(result) ? EXIT.ok : EXIT.failure
    }),
  })
  const checkPictogram = defineCommand({
    meta: {
      name: "pictograms",
      description: "Validate committed pictogram artwork and provenance",
    },
    args: { input: inputArg },
    run: action(ctx, async ({ input }) => {
      const result = await checkPictograms(ctx.workspace(), {
        input: input ? path.resolve(ctx.cwd, input) : undefined,
      })
      printLines(ctx.io, formatCheck(result))
      return passed(result) ? EXIT.ok : EXIT.failure
    }),
  })
  const artwork = defineCommand({
    meta: { name: "artwork", description: "Validate both icon and pictogram artwork" },
    run: action(ctx, async () => {
      const result = await checkArtwork(ctx.workspace())
      printLines(ctx.io, formatCheck(result))
      return passed(result) ? EXIT.ok : EXIT.failure
    }),
  })
  return { icons: checkIcon, pictograms: checkPictogram, artwork }
}

export function figmaCommands(ctx: CliContext): CommandDef {
  const exportSnapshot = defineCommand({
    meta: { name: "export", description: "Write the read-only REST snapshot" },
    args: { input: inputArg },
    run: action(ctx, async ({ input }) => {
      ctx.io.out(
        await exportFigma(
          ctx.workspace(),
          ctx.env,
          input ? path.resolve(ctx.cwd, input) : undefined,
        ),
      )
      return EXIT.ok
    }),
  })
  const exportPictogramAssets = defineCommand({
    meta: { name: "export", description: "Export pictogram variants from a pinned snapshot" },
    args: { input: { ...inputArg, required: true } },
    run: action(ctx, async ({ input }) => {
      ctx.io.out(await exportPictograms(ctx.workspace(), path.resolve(ctx.cwd, input), ctx.env))
      return EXIT.ok
    }),
  })
  const pictograms = defineCommand({
    meta: { name: "pictograms", description: "Pictogram artwork commands" },
    subCommands: { export: exportPictogramAssets },
  })
  return defineCommand({
    meta: { name: "figma", description: "Figma catalogue and artwork commands" },
    subCommands: {
      ...legacyFigmaSubCommands,
      export: exportSnapshot,
      pictograms,
    },
  })
}

export function artworkUpdateCommands(ctx: CliContext): SubCommandsDef {
  return {
    icons: defineCommand({
      meta: { name: "icons", description: "Generate icon artwork from a pinned snapshot" },
      args: { input: { ...inputArg, required: true } },
      run: action(ctx, async ({ input }) => {
        ctx.io.out(await updateIcons(ctx.workspace(), path.resolve(ctx.cwd, input)))
        return EXIT.ok
      }),
    }),
    pictograms: defineCommand({
      meta: { name: "pictograms", description: "Import pictogram artwork from a pinned snapshot" },
      args: { input: { ...inputArg, required: true } },
      run: action(ctx, async ({ input }) => {
        ctx.io.out(await updatePictograms(ctx.workspace(), path.resolve(ctx.cwd, input)))
        return EXIT.ok
      }),
    }),
  }
}
