import { implementationOrder } from "../figma/snapshot.ts"
import { UsageError } from "../lib/command.ts"

import type { Workspace } from "../adapters/workspace.ts"
import type { ParityCase } from "../schemas/parity.ts"
import { committedFile, readCases, readRegistry } from "../records/committed.ts"
import { buildCases, fanInCounts } from "./cases.ts"
import { formatCoverage, loadCoveragePopulations } from "./coverage.ts"

import { corpusPath, inventoryFileKey, inventoryNodes, statusesFrom } from "./context.ts"
import { output, type ParityOutput } from "./output.ts"
import type { QueueOptions } from "./types.ts"
function printCoverage(
  workspace: Workspace,
  options: QueueOptions,
  path_: string,
  corpus: ParityCase[],
): ParityOutput {
  const out: string[] = []
  const err: string[] = []
  const uncovered = options.uncovered
  const statuses = statusesFrom(options.status, "implemented,pending")
  const populations = loadCoveragePopulations(
    workspace,
    inventoryNodes(workspace),
    readRegistry(committedFile("registry", workspace.root)),
    corpus,
    statuses,
    undefined,
    inventoryFileKey(workspace),
  )
  const coverage = populations.devices
  const rows = coverage.rows.filter((row) => (uncovered ? row.missing.length : true))
  if (options.json) {
    out.push(
      JSON.stringify(
        {
          corpus: path_,
          statuses,
          uncovered: coverage.rows.flatMap((row) =>
            row.missing.map((device) => ({ nodeId: row.nodeId, device })),
          ),
          rows,
          totals: coverage.totals,
          populations,
        },
        null,
        2,
      ),
    )
    return output(0, out, err)
  }
  if (uncovered) {
    for (const row of coverage.rows) {
      for (const device of row.missing) {
        out.push(
          `uncovered ${row.nodeId} ${row.status.padEnd(11)} ${String(row.export ?? "-").padEnd(24)} ${device}`,
        )
      }
    }
    out.push(
      `${coverage.totals.missing} device case(s) missing on ${coverage.totals.nodes} node(s) ` +
        `with a device axis (${coverage.omitted} node(s) outside the status filter)`,
    )
    return output(0, out, err)
  }
  for (const line of formatCoverage(populations)) out.push(line)
  for (const row of rows) {
    out.push(
      `${row.nodeId} ${row.status.padEnd(11)} ${String(row.export ?? "-").padEnd(24)} ` +
        `declared ${row.declared.join(",")} · covered ${row.covered.join(",") || "-"} · ` +
        `missing ${row.missing.join(",") || "-"}`,
    )
  }
  out.push(
    `${coverage.totals.covered}/${coverage.totals.declared} device case(s) covered · ` +
      `${coverage.totals.missing} missing on ${coverage.totals.nodes} node(s) ` +
      `(${coverage.omitted} node(s) outside the status filter)`,
  )
  return output(0, out, err)
}

function filteredCases(
  cases: ReturnType<typeof buildCases>,
  predicate: (item: ReturnType<typeof buildCases>[number]) => boolean,
): ReturnType<typeof buildCases> {
  return Object.assign(cases.filter(predicate), { missing: cases.missing })
}

export function queue(workspace: Workspace, options: QueueOptions = {}): ParityOutput {
  let cases = buildCases(workspace, { statuses: statusesFrom(options.status) })
  const node = options.nodeId
  if (node) {
    const wanted = new Set(String(node).split(","))
    cases = filteredCases(cases, (item) => wanted.has(item.nodeId))
  }
  const path_ = corpusPath(workspace, options.casesFile)
  const corpus = readCases(path_) ?? []
  const mapped = new Set(corpus.map((entry) => entry.nodeId))
  if (options.coverage || options.uncovered) {
    return printCoverage(workspace, options, path_, corpus)
  }
  const order = options.order
  if (order !== undefined && order !== "fan-in") {
    throw new UsageError(`--order expects "fan-in", not ${order}`)
  }
  // Fan-in is a column and, with `--order fan-in`, the sort key; ties keep the
  // registry order (a stable sort), so the default walk is unchanged.
  const fanIn = fanInCounts(inventoryNodes(workspace))
  let rows = cases.map((item) => ({ ...item, fanIn: fanIn.get(item.nodeId) ?? 0 }))
  if (order === "fan-in") rows.sort((a, b) => b.fanIn - a.fanIn)
  let next: string[] | undefined
  if (options.next) {
    const size = options.size ?? 3
    if (!Number.isInteger(size) || size < 1) throw new UsageError("--size needs a positive integer")
    next = implementationOrder(
      inventoryNodes(workspace),
      new Set(rows.map((row) => row.nodeId)),
    ).slice(0, size)
    rows = next.flatMap((id) => rows.filter((row) => row.nodeId === id))
  }
  return queuedOutput(options, cases, rows, path_, mapped, next)
}

function queuedOutput(
  options: QueueOptions,
  cases: ReturnType<typeof buildCases>,
  rows: Array<ReturnType<typeof buildCases>[number] & { fanIn: number }>,
  path_: string,
  mapped: Set<string>,
  next?: string[],
): ParityOutput {
  const out: string[] = []
  const err: string[] = []
  if (options.unmapped) {
    const unmapped = rows.filter((item) => !mapped.has(item.nodeId))
    if (options.json) {
      out.push(
        JSON.stringify(
          { corpus: path_, unmapped, total: cases.length, mapped: mapped.size },
          null,
          2,
        ),
      )
    } else {
      for (const item of unmapped) {
        out.push(
          `unmapped ${item.nodeId} ${item.status.padEnd(11)} ${item.export.padEnd(24)} ` +
            `${item.storyIds.join(" ") || "(no declared story export)"}`,
        )
      }
      out.push(
        `${unmapped.length} of ${cases.length} case(s) without a committed mapping (${path_})`,
      )
    }
    return output(0, out, err)
  }
  if (options.json) {
    out.push(
      JSON.stringify(
        {
          cases: rows,
          missing: cases.missing ?? [],
          corpus: path_,
          mapped: mapped.size,
          ...(next ? { implementationOrder: next } : {}),
        },
        null,
        2,
      ),
    )
  } else {
    for (const item of rows) {
      const design = Object.entries(item.design)
        .map(([name, nodes]) => `${name}:${Array.isArray(nodes) ? nodes.join(",") || "-" : "-"}`)
        .join(" ")
      out.push(
        `${item.nodeId} ${item.status.padEnd(11)} ${item.export.padEnd(24)} ${String(item.fanIn).padStart(3)} ${item.storyIds.join(" ")} [${design}]`,
      )
    }
    for (const item of cases.missing ?? []) {
      out.push(`  dangling: ${item.nodeId} -> ${item.story} (file missing)`)
    }
    out.push(`${next ? rows.length : cases.length} case(s) · ${mapped.size} mapped in ${path_}`)
  }
  return output(0, out, err)
}
