import { defineCommand, type SubCommandsDef } from "citty"
import { RuleDispositionSchema } from "../schemas/rules.ts"
import { readLedger, readRulesSnapshot } from "../figma/rules.ts"
import {
  checkRules,
  formatRuleCard,
  formatRulesCheck,
  formatRulesPlan,
  initializeRules,
  markRule,
  readRuleCard,
  readRulesForNode,
  refreshRules,
  rulesPlan,
  synchronizeRules,
} from "../figma/rules-workflow.ts"
import { buildBrief, formatBrief } from "../figma/brief.ts"
import { buildNodeCard, formatNodeCard } from "../figma/card.ts"
import { refreshBrief } from "../figma/brief-workflow.ts"
import { buildBriefQueue, formatBriefQueue } from "../figma/brief-queue.ts"
import { commentsJson, commentsReport, formatComments } from "../figma/comments-workflow.ts"
import { figmaToken } from "../adapters/figma-token.ts"
import { UsageError } from "../lib/command.ts"
import { integer, jsonArg, requireText } from "./args.ts"
import { action, EXIT, printJson, printLines, type CliContext } from "./context.ts"
import { requireToken, requireTokenArg } from "./token.ts"

const stringArg = { type: "string" } as const
const idArg = { type: "positional", required: true } as const

function rulesRefresh(ctx: CliContext) {
  return defineCommand({
    meta: { name: "refresh", description: "Refresh the rules snapshot" },
    args: { page: stringArg, node: stringArg, "require-token": requireTokenArg },
    run: action(ctx, async ({ page, node, "require-token": required }) => {
      requireToken(ctx, required)
      const snapshot = await refreshRules(ctx.workspace(), figmaToken(ctx.env), {
        pageId: page,
        nodeId: node,
      })
      const cards = snapshot.pages.flatMap((page) =>
        page.containers.flatMap((container) => container.cards),
      )
      const real = cards.filter((card) => !card.placeholder).length
      ctx.io.out(
        `rules: refreshed ${snapshot.pages.length} page(s), ${cards.length} cards (${real} consolidated, ${cards.length - real} placeholder) · version ${snapshot.version}`,
      )
      return EXIT.ok
    }),
  })
}

function rulesMark(ctx: CliContext) {
  return defineCommand({
    meta: { name: "mark", description: "Record a rule disposition" },
    args: {
      id: idArg,
      disposition: stringArg,
      "title-en": stringArg,
      summary: stringArg,
      guide: stringArg,
      targets: stringArg,
      reason: stringArg,
      "duplicate-of": stringArg,
      request: stringArg,
      scope: stringArg,
    },
    run: action(ctx, (args) => {
      const disposition = RuleDispositionSchema.safeParse(args.disposition)
      if (!disposition.success) throw new UsageError("rules mark needs a valid --disposition")
      const card = markRule(ctx.workspace(), {
        cardId: args.id,
        disposition: disposition.data,
        titleEn: args["title-en"],
        summary: args.summary,
        guide: args.guide,
        targets: args.targets,
        reason: args.reason,
        duplicateOf: args["duplicate-of"],
        request: args.request,
        scope: args.scope,
      })
      ctx.io.out(
        `rules: ${args.id} → ${card.disposition}${card.titleEn ? ` · ${card.titleEn}` : ""}`,
      )
      return EXIT.ok
    }),
  })
}

function rulesNode(ctx: CliContext) {
  return defineCommand({
    meta: { name: "node", description: "Read rules for a node" },
    args: { id: idArg, json: jsonArg },
    run: action(ctx, ({ id, json }) => {
      const { cards } = readRulesForNode(ctx.workspace(), id)
      if (json) printJson(ctx.io, cards)
      else if (!cards.length) ctx.io.out(`rules: no rule targets ${id}`)
      else
        for (const card of cards) {
          const detail = card.summary ?? card.reason ?? card.body ?? ""
          ctx.io.out(
            `${card.disposition.padEnd(12)} ${card.titleEn ?? card.title}${detail ? ` — ${detail}` : ""}`,
          )
        }
      return EXIT.ok
    }),
  })
}

function rulesShow(ctx: CliContext) {
  return defineCommand({
    meta: { name: "show", description: "Read a rule card" },
    args: { id: idArg, json: jsonArg },
    run: action(ctx, ({ id, json }) => {
      const result = readRuleCard(ctx.workspace(), id)
      if (json) printJson(ctx.io, result)
      else printLines(ctx.io, { out: formatRuleCard(result.card, result.entry) })
      return EXIT.ok
    }),
  })
}

function rulesCommand(ctx: CliContext) {
  const plan = defineCommand({
    meta: { name: "plan", description: "Compare rules with the snapshot" },
    args: { json: jsonArg },
    run: action(ctx, ({ json }) => {
      const { titles: _titles, hasSnapshot, ...result } = rulesPlan(ctx.workspace())
      if (!hasSnapshot) {
        printJson(ctx.io, { version: result.version, counts: result.counts })
        ctx.io.out("rules: .figma/rules.json is missing; refresh to plan a diff")
      } else if (json) printJson(ctx.io, result)
      else printLines(ctx.io, { out: formatRulesPlan({ ...result, titles: _titles, hasSnapshot }) })
      return EXIT.ok
    }),
  })
  const init = defineCommand({
    meta: { name: "init" },
    run: action(ctx, () => {
      const result = initializeRules(ctx.workspace())
      ctx.io.out(`rules: init added ${result.added} pending card(s) · ${result.total} total`)
      return EXIT.ok
    }),
  })
  const sync = defineCommand({
    meta: { name: "sync" },
    run: action(ctx, () => {
      const result = synchronizeRules(ctx.workspace())
      ctx.io.out(`rules: sync marked ${result.removed} card(s) removed · ${result.total} total`)
      return EXIT.ok
    }),
  })
  return defineCommand({
    meta: { name: "rules", description: "Read and record Figma rules" },
    subCommands: {
      refresh: rulesRefresh(ctx),
      mark: rulesMark(ctx),
      node: rulesNode(ctx),
      show: rulesShow(ctx),
      plan,
      init,
      sync,
    },
  })
}

function commentsCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "comments", description: "Read Figma comments" },
    args: {
      refresh: { type: "boolean", default: false },
      "require-token": requireTokenArg,
      node: stringArg,
      open: { type: "boolean", default: false },
      json: jsonArg,
    },
    run: action(ctx, async ({ refresh, node, open, json, "require-token": required }) => {
      requireToken(ctx, required)
      const result = await commentsReport(
        ctx.workspace(),
        { refresh, nodeId: node, openOnly: open },
        refresh ? figmaToken(ctx.env) : undefined,
      )
      if (json && !(refresh && !node)) printJson(ctx.io, commentsJson(result))
      else printLines(ctx.io, { out: formatComments(result) })
      return EXIT.ok
    }),
  })
}

type BriefArgs = {
  node?: string
  queue: boolean
  card: boolean
  full: boolean
  limit?: string
  json?: boolean
  refresh: boolean
  "require-token": boolean
}

async function runBrief(ctx: CliContext, args: BriefArgs): Promise<number> {
  const { node, queue, card, full, limit, json, refresh } = args
  if (queue && node) throw new UsageError("choose --node or --queue")
  if (!queue && !node) throw new UsageError("figma brief needs --node <id> or --queue")
  if (!queue && (full || limit !== undefined))
    throw new UsageError("--full and --limit only apply to --queue")
  if (card && !node) throw new UsageError("--card needs --node <id>: one card per node")
  requireToken(ctx, args["require-token"])
  if (refresh) await refreshBrief(ctx.workspace(), () => figmaToken(ctx.env))
  if (queue) {
    const result = buildBriefQueue(ctx.workspace(), {
      scope: full ? "all" : "delta",
      lineCap: integer(limit, "--limit") ?? (full ? null : undefined),
    })
    if (json) printJson(ctx.io, result)
    else printLines(ctx.io, { out: formatBriefQueue(result) })
    return EXIT.ok
  }
  const requested = requireText(node, "--node <id> or --queue", "figma brief")
  if (card) {
    const nodeCard = buildNodeCard(ctx.workspace(), requested)
    if (json) printJson(ctx.io, nodeCard)
    else printLines(ctx.io, { out: formatNodeCard(nodeCard) })
    return EXIT.ok
  }
  const result = buildBrief(ctx.workspace(), requested)
  if (json) printJson(ctx.io, result)
  else
    printLines(ctx.io, {
      out: formatBrief(result, Boolean(readLedger(ctx.workspace().root, false))),
    })
  return EXIT.ok
}

function briefCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "brief", description: "Read implementation briefs" },
    args: {
      node: stringArg,
      queue: { type: "boolean", default: false },
      card: { type: "boolean", default: false },
      full: { type: "boolean", default: false },
      limit: stringArg,
      json: jsonArg,
      refresh: { type: "boolean", default: false },
      "require-token": requireTokenArg,
    },
    run: action(ctx, (args) => runBrief(ctx, args)),
  })
}

export function rulesCommands(ctx: CliContext): SubCommandsDef {
  return { rules: rulesCommand(ctx), comments: commentsCommand(ctx), brief: briefCommand(ctx) }
}

export function rulesCheckCommand(ctx: CliContext) {
  return defineCommand({
    meta: { name: "rules", description: "Check the rules ledger" },
    args: { strict: { type: "boolean", default: true }, json: jsonArg },
    run: action(ctx, ({ strict, json }) => {
      const workspace = ctx.workspace()
      const result = checkRules(workspace, strict)
      if (json) printJson(ctx.io, result)
      else
        printLines(ctx.io, {
          [result.errors.length ? "err" : "out"]: formatRulesCheck(
            result,
            Boolean(readRulesSnapshot(workspace.root, false)),
          ),
        })
      return result.errors.length ? EXIT.failure : EXIT.ok
    }),
  })
}
