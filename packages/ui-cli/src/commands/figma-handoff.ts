import { defineCommand } from "citty"
import {
  resolveHandoff,
  checkoutHandoff,
  handoffBrief,
  deltaArtifactUrl,
  type HandoffAdapters,
} from "../figma/handoff.ts"
import { buildBriefQueue, formatBriefQueue } from "../figma/brief-queue.ts"
import { UsageError } from "../lib/command.ts"
import { createHandoffMedia, handoffMediaAdapters } from "../figma/handoff-media.ts"
import { integer, jsonArg, requireText } from "./args.ts"
import { action, EXIT, printJson, printLines, type CliContext } from "./context.ts"

const referenceArg = { type: "positional", required: false } as const
const boolArg = { type: "boolean", default: false } as const

function handoffAdapters(ctx: CliContext): HandoffAdapters {
  return {
    gh: (args, cwd) => ctx.external.gh(args, cwd),
    git: (args, cwd) => ctx.external.git(args, cwd),
    pnpm: (args, cwd) => ctx.external.pnpm(args, cwd),
  }
}

function resolveCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "resolve", description: "Resolve an open drift pull request" },
    args: { reference: referenceArg, json: jsonArg },
    run: action(ctx, ({ reference, json }) => {
      const report = resolveHandoff(ctx.workspace(), reference, handoffAdapters(ctx))
      if (json) printJson(ctx.io, report)
      else {
        ctx.io.out(`pull request: #${report.number} ${report.url}`)
        ctx.io.out(`branch: ${report.headRefName}`)
        ctx.io.out(`state: ${report.state}`)
      }
      return EXIT.ok
    }),
  })
}

function checkoutCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "checkout", description: "Fetch and install the drift pull request worktree" },
    args: { pr: { ...referenceArg, required: true }, "dry-run": boolArg, json: jsonArg },
    run: action(ctx, ({ pr: reference, "dry-run": dryRun, json }) => {
      const pr = resolveHandoff(
        ctx.workspace(),
        requireText(reference, "<pr>", "handoff checkout"),
        handoffAdapters(ctx),
      )
      const report = checkoutHandoff(ctx.workspace(), pr, dryRun, handoffAdapters(ctx))
      if (json) printJson(ctx.io, report)
      else {
        ctx.io.out(
          `${report.dryRun ? "would create" : "created"}: ${report.path} (${report.branch})`,
        )
        for (const planned of report.actions) ctx.io.out(`  ${planned}`)
      }
      return EXIT.ok
    }),
  })
}

function briefCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "brief", description: "Read the PR delta and all node briefs" },
    args: { pr: { ...referenceArg, required: true }, json: jsonArg },
    run: action(ctx, async ({ pr: reference, json }) => {
      const pr = resolveHandoff(
        ctx.workspace(),
        requireText(reference, "<pr>", "handoff brief"),
        handoffAdapters(ctx),
      )
      const artifactUrl = deltaArtifactUrl(pr.body)
      const supplied = artifactUrl
        ? JSON.parse(await ctx.external.fetchUrl(artifactUrl))
        : undefined
      const result = handoffBrief(
        ctx.workspace(),
        pr,
        buildBriefQueue(ctx.workspace(), { scope: "pending", lineCap: null }),
        supplied,
      )
      if (json) printJson(ctx.io, result)
      else {
        ctx.io.out(`#${pr.number} · ${pr.headRefName} · ${pr.url}`)
        if (result.orderSource === "queue")
          ctx.io.err(
            `warning: the delta names no node the queue carries${result.dropped.length ? ` (${result.dropped.join(", ")})` : ""} — briefing the pending queue instead`,
          )
        else if (result.dropped.length)
          ctx.io.err(
            `warning: dropped ${result.dropped.length} delta id(s) the queue does not carry: ${result.dropped.join(", ")}`,
          )
        printLines(ctx.io, { out: formatBriefQueue(result.queue) })
      }
      return EXIT.ok
    }),
  })
}

function mediaCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "media", description: "Capture and attach before/after render evidence" },
    args: {
      pr: { type: "string", required: true },
      base: { type: "string", required: true },
      "dry-run": boolArg,
      json: jsonArg,
    },
    run: action(ctx, async ({ pr: value, base, "dry-run": dryRun, json }) => {
      const pr = resolveHandoff(
        ctx.workspace(),
        requireText(value, "--pr", "handoff media"),
        handoffAdapters(ctx),
      )
      const number = integer(String(pr.number), "--pr")
      if (number === undefined) throw new UsageError("--pr must be a positive number")
      const result = await createHandoffMedia(
        ctx.workspace(),
        {
          pr: number,
          base: requireText(base, "--base", "handoff media"),
          baseUrl: ctx.env.STORYBOOK_URL ?? "http://localhost:6006",
          dryRun,
        },
        { ...handoffMediaAdapters, git: ctx.external.git, gh: ctx.external.gh },
      )
      if (json) printJson(ctx.io, result)
      else {
        ctx.io.out(
          `${result.dryRun ? "would attach" : "attached"}: ${result.moved} moved case(s) across ${result.cases} capture(s)`,
        )
        for (const planned of result.actions) ctx.io.out(`  ${planned}`)
      }
      return EXIT.ok
    }),
  })
}

export function handoffCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "handoff" },
    subCommands: {
      resolve: resolveCommand(ctx),
      checkout: checkoutCommand(ctx),
      brief: briefCommand(ctx),
      media: mediaCommand(ctx),
    },
  })
}
