// The implementation brief of a node: one read-only, offline command that
// gathers what the coding agent needs before touching a component — the
// catalogue decision, the rules the designers wrote for it, the open comments
// and the design requests that already cite it.
import fs from "node:fs"
import path from "node:path"

import { readJson } from "../lib/json.ts"
import { enterRoot, resolveWorkspaceRoot } from "../lib/paths.ts"
import { walkFiles } from "../lib/fs.ts"
import { UsageError } from "../lib/command.ts"
import { InventorySchema, RegistrySchema } from "../schemas/catalogue.ts"
import { readComments, threadsForNode } from "./comments.ts"
import { readLedger, readRulesSnapshot, rulesForNode } from "./rules.ts"

const INVENTORY_PATH = "src/catalog/figma/inventory.json"
const REGISTRY_PATH = "src/catalog/figma/registry.json"
const REQUESTS_DIR = "docs/design-requests"

function option(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`)
  return index >= 0 ? argv[index + 1] : undefined
}

function designRequests(nodeId: string): string[] {
  const dashed = nodeId.replace(":", "-")
  const workspace = resolveWorkspaceRoot()
  return walkFiles(path.join(workspace, REQUESTS_DIR), (file) => file.endsWith(".md"))
    .filter((file) => {
      const text = fs.readFileSync(file, "utf8")
      return text.includes(nodeId) || text.includes(`node-id=${dashed}`)
    })
    .map((file) => path.relative(workspace, file).split(path.sep).join("/"))
    .sort()
}

export async function runBrief(argv: string[] = process.argv.slice(2)): Promise<number> {
  const root = enterRoot()
  const node = option(argv, "node")
  if (!node) throw new UsageError("figma:brief needs --node <id>")
  const json = argv.includes("--json")

  const inventory = readJson(path.join(root, INVENTORY_PATH), InventorySchema)
  const registry = readJson(path.join(root, REGISTRY_PATH), RegistrySchema)
  const component =
    inventory.components.find((entry) => entry.nodeId === node) ??
    inventory.components.find((entry) =>
      (entry.variants ?? []).some((variant) => variant.nodeId === node),
    )
  const identity = component?.nodeId ?? node
  const entry = registry.entries[identity]

  const ledger = readLedger(root, false)
  const snapshot = readRulesSnapshot(root, false)
  const rules = ledger ? rulesForNode(ledger, snapshot, root, node) : []
  const comments = readComments(root)
  const threads = comments ? threadsForNode(root, comments, node, { openOnly: true }) : []
  const requests = designRequests(identity)

  const report = {
    node: identity,
    requested: node,
    name: component?.name ?? null,
    page: component?.pageName ?? null,
    status: entry?.status ?? null,
    target: entry?.target ?? null,
    note: entry?.note ?? null,
    rules: rules.map((rule) => ({
      card: rule.id,
      disposition: rule.disposition,
      title: rule.titleEn ?? rule.title,
      titleSource: rule.title,
      summary: rule.summary ?? rule.reason ?? null,
      body: rule.body ?? null,
      guide: rule.guide ?? null,
    })),
    openComments: threads,
    designRequests: requests,
    commentsSnapshot: comments ? comments.fetchedAt : null,
  }

  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return 0
  }

  console.log(`node       ${identity}${component?.name ? ` · ${component.name}` : ""}`)
  if (component) console.log(`page       ${component.pageName}`)
  console.log(`status     ${entry?.status ?? "(no registry entry)"}`)
  if (entry?.target) console.log(`target     ${entry.target.module} · ${entry.target.export}`)
  const guides = [...new Set(rules.map((rule) => rule.guide).filter(Boolean))]
  if (guides.length) console.log(`guide      ${guides.join(", ")}`)

  if (!ledger) {
    console.log("rules      (no ledger yet: run figma:rules --init)")
  } else if (rules.length === 0) {
    console.log("rules      no rule targets this node")
  } else {
    const pending = rules.filter((rule) => rule.disposition === "pending").length
    console.log(`rules      ${rules.length} (${pending} pending)`)
    for (const rule of rules) {
      const title = rule.titleEn ?? rule.title
      const detail = rule.summary ?? rule.reason ?? rule.body?.replace(/\s+/g, " ") ?? ""
      console.log(`  ${rule.disposition.padEnd(12)} ${title}${detail ? ` — ${detail}` : ""}`)
      if (rule.guide) console.log(`  ${"".padEnd(12)} in ${rule.guide}`)
    }
  }

  if (!comments) {
    console.log("comments   (no snapshot: run figma:comments --refresh)")
  } else if (threads.length === 0) {
    console.log("comments   no open thread")
  } else {
    console.log(`comments   ${threads.length} open`)
    for (const thread of threads) {
      console.log(
        `  ${thread.createdAt.slice(0, 10)} ${thread.author || "unknown"}: ${thread.message.replace(/\s+/g, " ")}`,
      )
      for (const reply of thread.replies) {
        console.log(
          `    ${reply.createdAt.slice(0, 10)} ${reply.author || "unknown"}: ${reply.message.replace(/\s+/g, " ")}`,
        )
      }
    }
  }

  if (requests.length === 0) console.log("requests   none")
  else for (const request of requests) console.log(`request    ${request}`)

  return 0
}
