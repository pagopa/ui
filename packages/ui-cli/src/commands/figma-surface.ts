import { defineCommand } from "citty"
import path from "node:path"
import { figmaToken } from "../adapters/figma-token.ts"
import {
  currentSurface,
  normalizePageIds,
  readSurfaceTrees,
  selectSurfacePages,
  surfaceCompositionVerifier,
  syncPagesSurface,
  type PageSurfaceDiff,
} from "../figma/surface-sync.ts"
import { UsageError } from "../lib/command.ts"
import { action, EXIT, printJson, printLines, type CliContext } from "./context.ts"
import { requireToken, requireTokenArg } from "./token.ts"

const stringArg = { type: "string" } as const
const EMPTY_CATALOGUE_OK = { exitCode: EXIT.ok, out: [], err: [] }

function formatPageDiff(ctx: CliContext, entry: PageSurfaceDiff, dryRun: boolean): void {
  ctx.io.out(`${dryRun ? "would update" : "updated"}: ${entry.page.pageId} ${entry.page.pageName}`)
  for (const identity of entry.added)
    ctx.io.out(`  + ${identity.nodeId} ${identity.name} (${identity.decision})`)
  for (const identity of entry.removed) ctx.io.out(`  - ${identity.nodeId} ${identity.name}`)
  if (!entry.added.length && !entry.removed.length) ctx.io.out("  identities unchanged")
  for (const candidate of entry.compositionCandidates) {
    const details = [
      `drawn ${candidate.drawn}`,
      ...(candidate.width !== undefined ? [`${candidate.width}px`] : []),
      ...(candidate.suggestedDevice ? [`suggested ${candidate.suggestedDevice}`] : []),
    ].join(", ")
    ctx.io.out(`  ? composition candidate ${candidate.nodeId} ${candidate.name} (${details})`)
  }
  for (const stale of entry.staleCompositions) {
    ctx.io.out(`  ! stale composition ${stale.nodeId} ${stale.name} (deleted from file)`)
  }
  for (const unverified of entry.unverifiedCompositions) {
    ctx.io.out(
      `  ~ unverified composition ${unverified.nodeId} ${unverified.name} (not found in page tree read; check depth or page move)`,
    )
  }
}

export function surfaceCommand(ctx: CliContext) {
  const sync = defineCommand({
    meta: {
      name: "sync",
      description:
        "Refresh page identity census and discover composition candidates from page trees",
    },
    args: {
      page: {
        ...stringArg,
        description: "Page ID or comma-separated page IDs to refresh",
      },
      uncensused: {
        type: "boolean",
        default: false,
        description: "Refresh every published page missing from page-surface.json",
      },
      all: {
        type: "boolean",
        default: false,
        description: "Refresh every published and censused page",
      },
      input: stringArg,
      rest: { type: "boolean", default: false },
      "require-token": requireTokenArg,
      "dry-run": { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
    run: action(ctx, async (args) => {
      // Deduplicate before the single-page check: `--page 1:1,1:1` keeps the
      // legacy single-page JSON shape.
      const explicitPages = normalizePageIds(args.page ? args.page.split(",") : [])
      const scopeCount =
        Number(explicitPages.length > 0) + Number(args.uncensused) + Number(args.all)
      if (scopeCount === 0)
        throw new UsageError("figma surface sync requires --page <pageId>, --uncensused or --all")
      if (scopeCount > 1)
        throw new UsageError("choose only one of --page <pageId>, --uncensused or --all")
      if (args.input && args.rest) throw new UsageError("choose either --input <file> or --rest")
      if (!args.input && !args.rest)
        throw new UsageError("figma surface sync needs --input <file> or --rest")
      requireToken(ctx, args["require-token"])

      const workspace = ctx.workspace()
      const pageIds = selectSurfacePages(workspace, {
        pages: explicitPages.length ? explicitPages : undefined,
        uncensused: args.uncensused,
        all: args.all,
      })
      if (!pageIds.length) {
        if (args.json) {
          printJson(ctx.io, {
            surface: currentSurface(workspace),
            pages: [],
            dryRun: args["dry-run"],
            check: EMPTY_CATALOGUE_OK,
          })
        } else {
          ctx.io.out(
            args.uncensused
              ? "surface: all published pages are already censused"
              : "surface: no published or censused pages to refresh",
          )
        }
        return EXIT.ok
      }

      const token = args.rest ? figmaToken(ctx.env) : undefined
      const read = await readSurfaceTrees(workspace, pageIds, {
        input: args.input ? path.resolve(ctx.cwd, args.input) : undefined,
        token,
      })
      // Only a live, pinned read can tell a deleted node from one the tree read
      // did not reach; `--input` carries no verifier and reports missing nodes
      // as unverified.
      const verify =
        token && read.version
          ? surfaceCompositionVerifier(workspace, { token, version: read.version })
          : undefined
      const result = await syncPagesSurface(workspace, {
        pageIds,
        trees: read.trees,
        now: ctx.now().toISOString().slice(0, 10),
        dryRun: args["dry-run"],
        verify,
      })
      const singleExplicit = explicitPages.length === 1 && result.pages.length === 1
      if (args.json) {
        if (singleExplicit) {
          printJson(ctx.io, {
            ...result.pages[0],
            surface: result.surface,
            dryRun: result.dryRun,
            check: result.check,
          })
        } else {
          printJson(ctx.io, result)
        }
      } else {
        for (const entry of result.pages) formatPageDiff(ctx, entry, result.dryRun)
        printLines(ctx.io, { out: result.check.out, err: result.check.err })
        ctx.io.out(
          `catalogue overall: ${result.check.exitCode === EXIT.ok ? "pass" : "fail"} (${result.check.exitCode})`,
        )
      }
      return result.check.exitCode
    }),
  })
  return defineCommand({ meta: { name: "surface" }, subCommands: { sync } })
}
