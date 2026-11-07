import { defineCommand, type CommandDef, type SubCommandsDef } from "citty"
import path from "node:path"

import { checkStories, updateStories } from "../figma/stories.ts"
import { formatDeviceReport, readDevices } from "../figma/devices.ts"
import { buildStatusReport, formatStatusText } from "../figma/status.ts"
import { syncCatalogue, type CatalogueOptions, type CatalogueReport } from "../figma/sync.ts"
import { checkIcons, updateIcons } from "../figma/icons.ts"
import { exportFigma } from "../figma/export.ts"
import { checkPictograms, exportPictograms, updatePictograms } from "../figma/pictograms.ts"
import { checkArtwork } from "../figma/artwork.ts"
import { figmaToken } from "../adapters/figma-token.ts"
import { UsageError } from "../lib/command.ts"
import { formatCheck, passed } from "../checks/report.ts"
import { legacyFigmaSubCommands } from "./legacy.ts"
import { action, EXIT, printJson, printLines, type CliContext } from "./context.ts"

const inputArg = {
  type: "string",
  valueHint: "file",
  description: "Pinned Figma snapshot to read",
} as const

const jsonArg = {
  type: "boolean",
  default: false,
  description: "Print machine-readable JSON",
} as const

function assertSingleSource(input?: string, rest?: boolean): void {
  if (input && rest) throw new UsageError("choose either --input <file> or --rest")
}

function printCatalogue(ctx: CliContext, result: CatalogueReport): number {
  printLines(ctx.io, { out: result.out, err: result.err })
  return result.exitCode
}

function catalogueOptions(
  ctx: CliContext,
  args: {
    input?: string
    rest?: boolean
    plan?: boolean
    write?: boolean
    triage?: boolean
    save?: string
    prBody?: string
    delta?: string
    evidenceBase?: string
  },
): CatalogueOptions {
  const rest = Boolean(args.rest)
  const input = args.input ? path.resolve(ctx.cwd, args.input) : undefined
  return {
    input,
    rest,
    plan: args.plan,
    write: args.write,
    triage: args.triage,
    save: args.save,
    prBody: args.prBody,
    delta: args.delta,
    evidenceBase: args.evidenceBase,
    ...(rest ? { token: figmaToken(ctx.env) } : {}),
  }
}

export function catalogueCheckCommands(ctx: CliContext): SubCommandsDef {
  return {
    catalogue: defineCommand({
      meta: {
        name: "catalogue",
        description: "Validate the Figma catalogue and optional live delta",
      },
      args: {
        input: inputArg,
        rest: { type: "boolean", default: false, description: "Read the live file over REST" },
      },
      run: action(ctx, async (args) => {
        assertSingleSource(args.input, args.rest)
        return printCatalogue(
          ctx,
          await syncCatalogue(ctx.workspace(), catalogueOptions(ctx, args)),
        )
      }),
    }),
    stories: defineCommand({
      meta: { name: "stories", description: "Check the committed Storybook title map" },
      run: action(ctx, () => {
        const result = checkStories(ctx.workspace())
        printLines(ctx.io, formatCheck(result))
        return passed(result) ? EXIT.ok : EXIT.failure
      }),
    }),
    devices: defineCommand({
      meta: { name: "devices", description: "Check the committed device vocabulary" },
      args: { json: jsonArg },
      run: action(ctx, ({ json }) => {
        const result = readDevices(ctx.workspace())
        if (json) {
          printJson(ctx.io, {
            policy: result.policy,
            errors: result.errors,
            warnings: result.warnings,
            stats: result.stats,
            unmapped: result.unmapped,
            unused: result.unused,
          })
        } else {
          printLines(ctx.io, formatDeviceReport(result, true))
        }
        return result.errors.length ? EXIT.failure : EXIT.ok
      }),
    }),
  }
}

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
  const status = defineCommand({
    meta: { name: "status", description: "Report the token, snapshot, drift and pending queue" },
    args: {
      json: jsonArg,
      live: {
        type: "boolean",
        default: false,
        description: "Ask the live file for its version and last-modified date",
      },
    },
    run: action(ctx, async ({ json, live }) => {
      const result = await buildStatusReport(ctx.workspace(), { live }, ctx.env)
      if (json) printJson(ctx.io, result.report)
      else printLines(ctx.io, { out: formatStatusText(result.report) })
      return result.exitCode
    }),
  })
  const plan = defineCommand({
    meta: { name: "plan", description: "Compare the inventory with a pinned or live snapshot" },
    args: {
      input: inputArg,
      rest: { type: "boolean", default: false, description: "Read the live file over REST" },
      save: {
        type: "string",
        default: ".figma/live-rest.json",
        valueHint: "file",
        description: "Save the REST snapshot",
      },
      json: jsonArg,
    },
    run: action(ctx, async (args) => {
      assertSingleSource(args.input, args.rest)
      const useRest = !args.input || args.rest
      const result = await syncCatalogue(
        ctx.workspace(),
        catalogueOptions(ctx, {
          ...args,
          rest: useRest,
          plan: true,
          save: useRest ? args.save : undefined,
        }),
      )
      return printCatalogue(ctx, result)
    }),
  })
  const triage = defineCommand({
    meta: { name: "triage", description: "Refresh the inventory and queue the delta for review" },
    args: {
      input: inputArg,
      rest: { type: "boolean", default: false, description: "Read the live file over REST" },
      save: { type: "string", valueHint: "file", description: "Save the REST snapshot" },
      prBody: { ...inputArg, description: "Write the drift pull request body" },
      delta: { ...inputArg, description: "Write the machine-readable delta" },
      evidenceBase: { type: "string", valueHint: "url", description: "Evidence link base URL" },
    },
    run: action(ctx, async (args) => {
      assertSingleSource(args.input, args.rest)
      return printCatalogue(
        ctx,
        await syncCatalogue(
          ctx.workspace(),
          catalogueOptions(ctx, {
            ...args,
            prBody: args.prBody,
            evidenceBase: args.evidenceBase,
            write: true,
            triage: true,
          }),
        ),
      )
    }),
  })
  const devices = defineCommand({
    meta: { name: "devices", description: "Resolve the committed device vocabulary" },
    args: { json: jsonArg },
    run: action(ctx, ({ json }) => {
      const result = readDevices(ctx.workspace())
      if (json) {
        printJson(ctx.io, {
          policy: result.policy,
          errors: result.errors,
          warnings: result.warnings,
          stats: result.stats,
          unmapped: result.unmapped,
          unused: result.unused,
        })
      } else {
        printLines(ctx.io, formatDeviceReport(result, false))
      }
      return result.errors.length ? EXIT.failure : EXIT.ok
    }),
  })
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
      ...legacyFigmaSubCommands(ctx),
      status,
      plan,
      triage,
      devices,
      export: exportSnapshot,
      pictograms,
    },
  })
}

export function artworkUpdateCommands(ctx: CliContext): SubCommandsDef {
  return {
    stories: defineCommand({
      meta: { name: "stories", description: "Record the Storybook title map" },
      run: action(ctx, () => {
        ctx.io.out(updateStories(ctx.workspace()))
        return EXIT.ok
      }),
    }),
    inventory: defineCommand({
      meta: {
        name: "inventory",
        description: "Refresh the Figma inventory and optionally triage drift",
      },
      args: {
        input: inputArg,
        rest: { type: "boolean", default: false, description: "Read the live file over REST" },
        triage: { type: "boolean", default: false, description: "Queue changed nodes for review" },
        save: { type: "string", valueHint: "file", description: "Save the REST snapshot" },
        prBody: { ...inputArg, description: "Write the drift pull request body" },
        delta: { ...inputArg, description: "Write the machine-readable delta" },
        evidenceBase: { type: "string", valueHint: "url", description: "Evidence link base URL" },
      },
      run: action(ctx, async (args) => {
        assertSingleSource(args.input, args.rest)
        return printCatalogue(
          ctx,
          await syncCatalogue(
            ctx.workspace(),
            catalogueOptions(ctx, {
              ...args,
              prBody: args.prBody,
              evidenceBase: args.evidenceBase,
              write: true,
            }),
          ),
        )
      }),
    }),
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

export function catalogueCheckResult(result: CatalogueReport): number {
  return result.exitCode
}
