#!/usr/bin/env node
// Which React component of @pagopa/ui renders this Figma node?
//
// A consuming agent receives a layout and has to answer that per part. The
// answer travels with the package as `figma-map.json`, generated from the
// design system's own catalogue; this command reads it offline. It exists so
// the answer costs one lookup instead of a read of the whole map: a layout of
// forty parts asks forty questions, and each one should return a line.
//
//   pagopa-ui-map resolve 50:1700        one node
//   pagopa-ui-map search alert           find nodes by name, export or id
//   pagopa-ui-map export Alert           the nodes one export renders
//
// Every command accepts `--json`.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const MAP_PATH = path.join(HERE, "..", "figma-map.json")

export function loadMap(file = MAP_PATH) {
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

// A Figma URL carries the node as `?node-id=50-1700`; the API and the map use
// `50:1700`. Both reach the same row.
export function normalizeNodeId(value) {
  const text = String(value ?? "").trim()
  const fromUrl = /[?&]node-id=([^&]+)/.exec(text)
  const raw = decodeURIComponent(fromUrl ? fromUrl[1] : text).trim()
  return /^\d+-\d+$/.test(raw) ? raw.replace("-", ":") : raw
}

export function nodeNames(node) {
  return node.exports?.length ? node.exports.join(", ") : "—"
}

export function formatNode(nodeId, node) {
  const where = [node.type, node.page].filter(Boolean).join(", ")
  const lines = [
    `${nodeId}  ${node.figma ?? "(unnamed in the file)"}${where ? `  (${where})` : ""}`,
    `  exports: ${nodeNames(node)}`,
    `  status:  ${node.status}${node.reason ? ` — ${node.reason}` : ""}`,
  ]
  if (node.story) lines.push(`  story:   ${node.story}`)
  return lines.join("\n")
}

export function resolveNode(map, value) {
  const nodeId = normalizeNodeId(value)
  return { nodeId, node: map.nodes[nodeId] }
}

// Both directions of the map, scored so a name that starts the query wins over
// one that merely contains it. The id is searchable too: agents read ids off
// Figma and paste fragments of them.
export function searchNodes(map, query) {
  const needle = String(query ?? "")
    .trim()
    .toLowerCase()
  if (!needle) return []
  const scored = []
  for (const [nodeId, node] of Object.entries(map.nodes)) {
    const names = [node.figma ?? "", ...node.exports, ...(node.story ? [node.story] : [])].map(
      (name) => name.toLowerCase(),
    )
    const id = nodeId.toLowerCase()
    let score = 0
    if (id === needle) score = 100
    else if (id.startsWith(needle)) score = 60
    else if (names.some((name) => name === needle)) score = 50
    else if (names.some((name) => name.startsWith(needle))) score = 40
    else if (names.some((name) => name.includes(needle))) score = 20
    else if (id.includes(needle)) score = 10
    if (score > 0) scored.push({ nodeId, node, score })
  }
  return scored
    .sort((left, right) => right.score - left.score || left.nodeId.localeCompare(right.nodeId))
    .map(({ nodeId, node }) => ({ nodeId, node }))
}

export function exportNodes(map, value) {
  const name = String(value ?? "").trim()
  const match = Object.keys(map.exports).find((key) => key.toLowerCase() === name.toLowerCase())
  return { name: match ?? name, nodeIds: match ? map.exports[match] : undefined }
}

export function suggest(map, query, limit = 3) {
  return searchNodes(map, query)
    .slice(0, limit)
    .map(({ nodeId, node }) => `${nodeId} (${node.figma ?? nodeNames(node)})`)
}

function usage() {
  return `usage: pagopa-ui-map <command> [--json]

  resolve <nodeId|figma-url>   the component a node renders, or why none does
  search <query>               nodes by name, export, story or node id
  export <Name>                every node one export renders

  --json      print the rows as JSON
  --limit N   how many search rows (default 10)

The map ships with the package; node_modules/@pagopa/ui/skills/figma-to-ui/SKILL.md
describes how a layout is read with it.`
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function fail(message, exit = 1) {
  process.stderr.write(`${message}\n`)
  process.exitCode = exit
}

export function main(argv, map = loadMap()) {
  const jsonFlag = argv.includes("--json")
  const limitAt = argv.indexOf("--limit")
  const limit = limitAt === -1 ? 10 : Number(argv[limitAt + 1])
  const [command, ...rest] = argv.filter(
    (arg, index) => !arg.startsWith("--") && (limitAt === -1 || index !== limitAt + 1),
  )
  const value = rest.join(" ")

  if (command === undefined || command === "help") {
    process.stdout.write(`${usage()}\n`)
    return 0
  }
  if (command === "resolve") {
    if (!value)
      return fail("resolve needs a node id, for example: pagopa-ui-map resolve 50:1700", 2)
    const { nodeId, node } = resolveNode(map, value)
    if (!node) {
      // A variant id (`50:1701`) has no row of its own: the component set it
      // belongs to does, on the same page. Falling back to the page tells the
      // reader which id to paste instead of only that this one failed.
      const hints = suggest(map, nodeId)
      const page = nodeId.includes(":") ? `${nodeId.slice(0, nodeId.indexOf(":"))}:` : ""
      const nearby = hints.length || !page ? hints : suggest(map, page, 5)
      const label = hints.length || !page ? "closest" : `page ${page} holds`
      return fail(
        `no node ${nodeId} in the map (${Object.keys(map.nodes).length} nodes).${
          nearby.length ? `\n${label}: ${nearby.join("; ")}` : ""
        }`,
      )
    }
    process.stdout.write(jsonFlag ? json({ nodeId, node }) : `${formatNode(nodeId, node)}\n`)
    return 0
  }
  if (command === "search") {
    const rows = searchNodes(map, value).slice(0, Number.isFinite(limit) ? limit : 10)
    if (!rows.length)
      return fail(
        `nothing matches "${value}" (${Object.keys(map.nodes).length} nodes). A component the file never drew has no row: try "pagopa-ui-map export <Name>".`,
      )
    process.stdout.write(
      jsonFlag
        ? json(rows)
        : `${rows
            .map(
              ({ nodeId, node }) =>
                `${nodeId}  ${node.figma ?? "—"}  → ${nodeNames(node)}  [${node.status}]`,
            )
            .join("\n")}\n`,
    )
    return 0
  }
  if (command === "export") {
    const { name, nodeIds } = exportNodes(map, value)
    if (!nodeIds) {
      const known = Object.keys(map.exports).filter((key) =>
        key.toLowerCase().includes(value.toLowerCase()),
      )
      return fail(
        `"${value}" is not an export of the package.${
          known.length ? `\nclosest: ${known.slice(0, 3).join(", ")}` : ""
        }`,
      )
    }
    if (!nodeIds.length) {
      process.stdout.write(
        `${name} has no Figma source: it is public, and no node of the file maps to it.\n`,
      )
      return 0
    }
    process.stdout.write(
      jsonFlag
        ? json({ name, nodes: nodeIds.map((nodeId) => ({ nodeId, ...map.nodes[nodeId] })) })
        : `${nodeIds.map((nodeId) => formatNode(nodeId, map.nodes[nodeId])).join("\n")}\n`,
    )
    return 0
  }
  return fail(`${usage()}\n`, 2)
}

if (import.meta.main) main(process.argv.slice(2))
