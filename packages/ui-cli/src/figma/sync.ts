#!/usr/bin/env node
// Figma delta tooling — read-only against Figma.
//
// Static checks (no network, run in CI):
//   node src/cli.ts figma sync
//     - inventory/registry/file-key consistency
//     - every published Figma node accounted (registry entry or bulk rule)
//     - every implemented target (module + export [+ story]) exists
//     - every implemented target is rendered by its linked story, or listed in
//       src/catalog/figma/evidence-exceptions.json with a reason
//     - changed implementations carry explicit story exports rendering every
//       mapped implementation
//     - every implemented node linked to a single story export shows that node
//       in the story's effective parameters.design (the Design panel mapping)
//     - every public export maps to a registry target, a module pattern or
//       src/catalog/figma/api-exceptions.json (reverse coverage)
//     - icon/pictogram public names cover manifest identities node-for-node
//     - warns when the inventory snapshot is older than 30 days
//
// Drift check against a complete pinned export (see the figma-to-code skill):
//   node src/cli.ts figma sync --input .figma/live-rest.json [--plan]
//     - reports NEW / REMOVED / CHANGED / RENAMED / MOVED / AFFECTED nodes
//     - exits 1 on any drift so the delta is explicitly reconciled
//
// Refresh the committed inventory from a live export:
//   node src/cli.ts figma sync --write --input .figma/live-rest.json
//
// Refresh + queue new/changed/affected implementations for review (delta triage).
// Mocked demos retain their status and note and are not queued: they are demos,
// not approvals to renew. Merging the drift PR is the review record.
//   node src/cli.ts figma sync --triage --input .figma/live-rest.json
//
// PR mode for the scheduled drift job: refresh only when there is drift and
// write the review instructions as a markdown body for the pull request.
//   node src/cli.ts figma sync --rest --pr-body .figma/pr-body.md
//
// Fetch the live export directly (requires FIGMA_TOKEN, read-only scope):
//   FIGMA_TOKEN=... node src/cli.ts figma sync --rest [--write|--triage]
//
// --write/--triage default to .figma/live-rest.json, or .figma/live.json when
// only the older MCP dump exists. --pr-body exits 0 with and without drift; the
// workflow branches on the git diff.
// The Figma side is never written to. Mapping is stored in the repo, keyed by
// nodeId, so renames in Figma never break the mapping.
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"
import {
  catalogueIndex,
  compareSnapshots,
  fileKeyFromSource,
  implementationOrder,
  normalizeLive,
  type SnapshotDelta,
} from "./snapshot.ts"
import type { RegistryEntry } from "../schemas/catalogue.ts"
import {
  checkDevicePolicy,
  declaredDevices,
  deviceAxes,
  formatDeviceLine,
  loadDevicePolicy,
  type DeviceStats,
} from "./devices.ts"
import {
  DEVICE_EXCEPTIONS_PATH,
  deviceCoverage,
  isDraftCase,
  loadCaseFile,
  loadDeviceExceptions,
  validateCaseFile,
} from "../parity/cases.ts"
import { fetchFigmaSnapshot } from "./rest.ts"
import { staleStoryTitles } from "./stories.ts"
import { requireFigmaToken } from "./token.ts"
import { EVIDENCE_DIR, evidencePaths, loadManifest } from "../parity/evidence.ts"
import { renderedStoryExports, runtimeExports, storyDesignNodes } from "../lib/source-modules.ts"
import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import {
  ApiExceptionsSchema,
  EvidenceExceptionsSchema,
  InventorySchema,
  RegistrySchema,
  type ApiExceptions,
  type InventoryNode,
  type Registry,
} from "../schemas/catalogue.ts"
import type { DevicePolicy } from "../schemas/devices.ts"
import {
  absolutePath,
  artworkPath,
  enterRoot,
  fileIdentity,
  resolveStoriesRoot,
} from "../lib/paths.ts"

const ROOT = enterRoot()
const INVENTORY_PATH = "src/catalog/figma/inventory.json"
const REGISTRY_PATH = "src/catalog/figma/registry.json"
const FILE_TS_PATH = "src/catalog/figma/file.ts"
const ICONS_PATH = "src/components/icons/figma-inventory.ts"
const VALID_STATUSES = new Set(["implemented", "mocked", "excluded", "pending"])

const EVIDENCE_EXCEPTIONS_PATH = "src/catalog/figma/evidence-exceptions.json"
const API_EXCEPTIONS_PATH = "src/catalog/figma/api-exceptions.json"

type NodeDeltaKey = "added" | "changed" | "renamed" | "moved" | "removed" | "affected" | "baseline"

export async function runSync(argv: string[] = process.argv.slice(2)): Promise<number> {
  function flag(name: string): boolean {
    return argv.includes(`--${name}`)
  }
  function option(name: string): string | undefined {
    const index = argv.indexOf(`--${name}`)
    return index >= 0 ? argv[index + 1] : undefined
  }

  // Fail fast before any file work: --rest needs the read-only token.
  if (flag("rest")) requireFigmaToken()

  const errors: string[] = []
  const warnings: string[] = []
  let devicePolicy: DevicePolicy | null = null
  let deviceStats: DeviceStats | null = null

  function fail(message: string): void {
    errors.push(message)
  }

  // The coverage line (RA4), printed under the vocabulary line of RA1: what the
  // `implemented` sets declare against what the reviewed corpus covers.
  function formatCoverageLine(stats: {
    sets: number
    covered: number
    missing: number
    exceptions: number
  }): string {
    return (
      `devices: ${stats.sets} implemented sets · covered ${stats.covered} · ` +
      `missing ${stats.missing} · exceptions ${stats.exceptions}`
    )
  }

  function exportNames(file: string): Set<string> {
    return new Set(runtimeExports(file).keys())
  }

  // A registry module may be missing or moved: the existence check reports it
  // as `module not found`, so the reads that run before that report stay quiet
  // instead of failing on the missing file.
  function moduleExports(file: string): Map<string, string> {
    return fs.existsSync(absolutePath(file)) ? runtimeExports(file) : new Map()
  }

  // Walks the re-export graph from the public entry and records, for every
  // runtime export, the module that declares it. Types are ignored: they do not
  // exist at runtime and never need a Figma mapping.
  function collectPublicExports(): Map<string, string> {
    return runtimeExports("src/pagopa-ui.ts")
  }

  // Declaring runtime identities actually rendered by exported stories. The
  // stories live in the Storybook application; `PAGOPA_UI_STORIES_ROOT` lets a
  // regression fixture keep them inside its own package-shaped tree.
  function storyImports(): Map<string, Set<string>> {
    const byFile = new Map<string, Set<string>>()
    const directory = resolveStoriesRoot()
    for (const file of fs.readdirSync(directory, { recursive: true })) {
      if (typeof file !== "string" || !file.endsWith(".stories.tsx")) continue
      const identity = fileIdentity(path.join(directory, file))
      const names = new Set(
        [...renderedStoryExports(identity).values()].flatMap((names) => [...names]),
      )
      byFile.set(identity, names)
    }
    return byFile
  }

  function readExceptions<T>(file: string, schema: z.ZodType<T>): T | null {
    if (!fs.existsSync(path.join(ROOT, file))) return null
    try {
      return parseSchema(schema, readJson(path.join(ROOT, file)), file)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      fail(`${file}: invalid JSON (${message})`)
      return null
    }
  }

  // The registry and the exceptions are JSON maps keyed by a node id: the key is
  // data, so the maps are rebuilt instead of deleting a dynamic key.
  function dropKeys<T>(record: Record<string, T>, keys: Set<string>): Record<string, T> {
    return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.has(key)))
  }

  function matchesModulePattern(file: string, pattern: string): boolean {
    if (pattern.endsWith("*")) return file.startsWith(pattern.slice(0, -1))
    return file === pattern
  }

  // ---------------------------------------------------------------- load state

  if (!fs.existsSync(path.join(ROOT, INVENTORY_PATH))) {
    fail(`missing ${INVENTORY_PATH} (run with --write and a live export)`)
  }
  if (!fs.existsSync(path.join(ROOT, REGISTRY_PATH))) {
    fail(`missing ${REGISTRY_PATH}`)
  }
  if (errors.length) {
    for (const error of errors) console.error(`error: ${error}`)
    return 1
  }

  let inventory: z.infer<typeof InventorySchema> = parseSchema(
    InventorySchema,
    readJson(path.join(ROOT, INVENTORY_PATH)),
    INVENTORY_PATH,
  )
  const registry: Registry = parseSchema(
    RegistrySchema,
    readJson(path.join(ROOT, REGISTRY_PATH)),
    REGISTRY_PATH,
  )
  const committed: InventoryNode[] = inventory.components
  const committedById = new Map(committed.map((node) => [node.nodeId, node]))
  const pendingWrites = new Map<string, unknown>()

  try {
    const normalized = normalizeLive(inventory)
    if (inventory.schemaVersion === 2) {
      for (const node of normalized) {
        if (committedById.get(node.nodeId)?.contractFingerprint !== node.contractFingerprint) {
          fail(`${INVENTORY_PATH}: contract fingerprint mismatch for ${node.nodeId}`)
        }
      }
    }
  } catch (error) {
    fail(`${INVENTORY_PATH}: ${error instanceof Error ? error.message : String(error)}`)
  }

  let evidenceExceptions: Record<string, string> =
    readExceptions(EVIDENCE_EXCEPTIONS_PATH, EvidenceExceptionsSchema)?.storyEvidence ?? {}
  const apiExceptions: ApiExceptions = readExceptions(API_EXCEPTIONS_PATH, ApiExceptionsSchema) ?? {
    modulePatterns: {},
    exports: {},
  }

  // ------------------------------------------------------------- drift handling

  let live: InventoryNode[] | null = null
  let liveVersion: string | undefined
  let liveLastModified: string | undefined
  let restSnapshot: Awaited<ReturnType<typeof fetchFigmaSnapshot>> | null = null
  let inputOption = option("input")
  if (!inputOption && (flag("write") || flag("triage") || flag("pr-body"))) {
    // Convenience: the pinned REST snapshot `figma export` writes is the
    // default source; the older MCP dump path still works when it is the only
    // file present.
    for (const candidate of [".figma/live-rest.json", ".figma/live.json"]) {
      if (fs.existsSync(path.join(ROOT, candidate))) {
        inputOption = candidate
        break
      }
    }
  }
  if (flag("rest")) {
    const keyFromFile = fileKeyFromSource()
    restSnapshot = await fetchFigmaSnapshot(
      keyFromFile ?? inventory.fileKey,
      committed.filter((node) => node.sources?.includes("mcp")),
    )
    liveVersion = restSnapshot.version
    liveLastModified = restSnapshot.lastModified
    live = normalizeLive(restSnapshot)
  } else if (inputOption) {
    const input: unknown = JSON.parse(fs.readFileSync(path.resolve(inputOption), "utf8"))
    if (
      input &&
      typeof input === "object" &&
      "version" in input &&
      typeof input.version === "string"
    ) {
      liveVersion = input.version
    }
    if (
      input &&
      typeof input === "object" &&
      "lastModified" in input &&
      typeof input.lastModified === "string"
    ) {
      liveLastModified = input.lastModified
    }
    if (
      input &&
      typeof input === "object" &&
      "fileKey" in input &&
      typeof input.fileKey === "string" &&
      input.fileKey !== inventory.fileKey
    ) {
      fail("live export file key does not match the committed inventory")
    }
    live = normalizeLive(input)
  } else if (flag("write") || flag("triage") || flag("pr-body")) {
    console.error(
      "--write/--triage/--pr-body need a live source: pass --input <file> (Figma MCP export) or --rest.",
    )
    return 2
  }

  // The REST read is the pinned snapshot the evidence refresh reads next: keep
  // it beside the PR body so the drift job does not spend a second API read.
  if (restSnapshot) {
    const saveOption = option("save") ?? ".figma/live-rest.json"
    const savePath = path.resolve(ROOT, saveOption)
    try {
      fs.mkdirSync(path.dirname(savePath), { recursive: true })
      fs.writeFileSync(savePath, `${JSON.stringify(restSnapshot, null, 2)}\n`)
      // `--plan` owns stdout: the plan stays parseable as JSON.
      const report = flag("plan") ? console.error : console.log
      report(`snapshot: ${saveOption} (version ${restSnapshot.version})`)
    } catch (error) {
      fail(
        `cannot save the REST snapshot to ${saveOption}: ` +
          (error instanceof Error ? error.message : String(error)),
      )
    }
  } else if (option("save")) {
    fail("--save needs --rest: only a REST read produces the pinned snapshot")
  }

  const deltaPath = option("delta")
  const rawEvidenceBase = option("evidence-base")
  const evidenceBase = rawEvidenceBase?.replace(/\/+$/, "")
  if (evidenceBase && !/^https:\/\//.test(evidenceBase)) {
    fail("--evidence-base must be an https URL")
  }
  if (deltaPath && !live) {
    fail("--delta needs a live source: pass --input <file> or --rest")
  }

  const delta: SnapshotDelta = live ? compareSnapshots(committed, live) : compareSnapshots([], [])

  for (const node of live ?? []) {
    if (committedById.get(node.nodeId)?.designFingerprint && !node.designFingerprint) {
      fail(`incomplete design evidence for ${node.nodeId}: a full snapshot cannot be downgraded`)
    }
  }

  const writeRequested = flag("write") || flag("triage")
  const prBodyPath = option("pr-body")
  const driftKeys: Array<keyof SnapshotDelta> = [
    "added",
    "removed",
    "changed",
    "renamed",
    "moved",
    "baseline",
    "affected",
  ]
  const hasDrift = Boolean(live) && driftKeys.some((key) => delta[key].length)

  if (live && (writeRequested || (prBodyPath && hasDrift))) {
    inventory = {
      schemaVersion: 2,
      fileKey: inventory.fileKey,
      syncedAt: new Date().toISOString().slice(0, 10),
      ...(liveVersion ? { fileVersion: liveVersion } : {}),
      ...(liveLastModified ? { lastModified: liveLastModified } : {}),
      components: live,
    }
    pendingWrites.set(INVENTORY_PATH, inventory)
    committed.length = 0
    committedById.clear()
    for (const node of live) {
      committed.push(node)
      committedById.set(node.nodeId, node)
    }

    const date = new Date().toISOString().slice(0, 10)
    registry.entries ??= {}
    const renewed = new Set<string>()
    const removed = new Set<string>()
    for (const node of [...delta.added, ...delta.changed, ...delta.affected]) {
      const previous = registry.entries[node.nodeId]
      const rule = registry.bulkRules?.find((rule) => rule.pageId === node.pageId)
      if (previous?.status === "excluded" || (!previous && rule?.status === "excluded")) continue
      // Mocked demos are not approvals to renew: they stay demos and the drift
      // PR shows their change for the human decision.
      if (previous?.status === "mocked") continue
      if (previous && !VALID_STATUSES.has(previous.status)) continue
      registry.entries[node.nodeId] = {
        ...previous,
        status: "pending",
        note: `Figma delta ${date}: review new/changed node or dependency before marking implemented`,
      }
      renewed.add(node.nodeId)
    }
    for (const node of delta.removed) removed.add(node.nodeId)
    registry.entries = dropKeys<Registry["entries"][string]>(registry.entries, removed)
    evidenceExceptions = dropKeys<string>(evidenceExceptions, new Set([...renewed, ...removed]))
    pendingWrites.set(REGISTRY_PATH, registry)
    pendingWrites.set(EVIDENCE_EXCEPTIONS_PATH, { storyEvidence: evidenceExceptions })
  }

  // ------------------------------------------------------------ drift PR body

  function figmaNodeLink(nodeId: string): string {
    return `https://www.figma.com/design/${inventory.fileKey}?node-id=${nodeId.replace(":", "-")}`
  }

  // The device dimension of the review (RA2, gap VG1/VG2): a `Device` axis means
  // the set draws one composition per device, so a change to one variant is a
  // change to that device's composition — and a node with no changed variant still
  // owes the reviewer the list of devices it declares. Generated from the
  // inventory, so it follows renames and additions by itself (R8).
  const DEVICE_INSTRUCTION =
    "A `Device` axis is part of the contract: inspect and render **every** declared " +
    "device (`.agents/skills/figma-to-code/references/devices.md`); " +
    "save one case per device."

  function boxText(box: { width: number; height: number } | undefined): string {
    return box ? `${box.width}×${box.height}` : "box unknown"
  }

  function renderDevices(node: InventoryNode, changed: Map<string, string>): string[] {
    if (!devicePolicy) return []
    const variants = node.variants ?? []
    const devices = declaredDevices(devicePolicy, node)
    if (!variants.length) {
      if (!devices.length) return []
      const axes = deviceAxes(devicePolicy, node)
        .map((axis) => `\`${axis.token}\``)
        .join(", ")
      return [
        `- devices (${devices.length} declared by ${axes}): ` +
          `${devices.map((device) => `\`${device}\``).join(" · ")} · no per-variant box in this export`,
        `  - ${DEVICE_INSTRUCTION}`,
      ]
    }
    const lines = [`- devices (${devices.length} declared):`]
    for (const variant of variants) {
      const change = changed.get(variant.nodeId)
      lines.push(
        `  - \`${variant.device ?? "any"}\` · \`${variant.nodeId}\` · ${boxText(variant.box)} · ` +
          `[${variant.name}](${figmaNodeLink(variant.nodeId)}) · ${change ? `changed (${change})` : "unchanged"}`,
      )
    }
    lines.push(
      devices.length
        ? `  - ${DEVICE_INSTRUCTION}`
        : "  - no device declared: one composition at every width",
    )
    return lines
  }

  // The reviewed cases and the evidence manifest of one node: the PR names the
  // case ids and, when the bundle is committed, the pinned reference image. The
  // local agent still attaches the render; CI never embeds a component image.
  let evidenceCasesCache: ReturnType<typeof loadCaseFile> | null = null
  let evidenceManifestCache: ReturnType<typeof loadManifest> | null | undefined
  function evidenceFor(nodeId: string): {
    ids: string[]
    links: Array<{ id: string; href: string }>
  } {
    if (!evidenceCasesCache) {
      try {
        evidenceCasesCache = loadCaseFile()
      } catch {
        evidenceCasesCache = []
      }
    }
    const corpus = evidenceCasesCache.filter((entry) => entry.nodeId === nodeId)
    if (!corpus.length) return { ids: [], links: [] }
    if (evidenceManifestCache === undefined) {
      try {
        const manifestPath = evidencePaths().manifest
        evidenceManifestCache = fs.existsSync(manifestPath) ? loadManifest(manifestPath) : null
      } catch {
        evidenceManifestCache = null
      }
    }
    const links = evidenceBase
      ? corpus.flatMap((entry) => {
          const record = evidenceManifestCache?.cases?.[entry.id]
          return record
            ? [{ id: entry.id, href: `${evidenceBase}/${EVIDENCE_DIR}/${record.png}` }]
            : []
        })
      : []
    return { ids: corpus.map((entry) => entry.id), links }
  }

  // Readable review instructions for the scheduled drift pull request: the
  // summary, the per-node context and the decisions the reviewer records in
  // registry.json. Merging the PR is the review record.
  function renderPrBody(): string {
    const date = new Date().toISOString().slice(0, 10)
    const classes: Array<[NodeDeltaKey, string]> = [
      ["added", "New nodes"],
      ["changed", "Changed nodes"],
      ["renamed", "Renamed identities"],
      ["moved", "Moved identities"],
      ["removed", "Removed nodes"],
      ["affected", "Affected implementations"],
      ["baseline", "Missing design baseline"],
    ]
    const changedVariants = new Map(
      delta.changedVariants.map((change) => [change.nodeId, change.class]),
    )
    const pages = new Map()
    for (const [key] of classes) {
      for (const node of delta[key]) {
        pages.set(node.pageName, (pages.get(node.pageName) ?? 0) + 1)
      }
    }
    const lines = [
      `# Figma drift — ${date}`,
      "",
      `Live snapshot compared with \`src/catalog/figma/inventory.json\` (file \`${inventory.fileKey}\`).`,
      "The inventory is refreshed and every production node below is queued as `pending`; merging this PR is the review record.",
      "",
      "## Summary",
      "",
      ...classes.map(([key, label]) => `- ${label}: ${delta[key].length}`),
    ]
    if (pages.size) {
      lines.push(
        "",
        `By page: ${[...pages].map(([page, count]) => `${page} (${count})`).join(" · ")}`,
      )
    }
    lines.push(
      "",
      "## Instructions — review",
      "",
      "For every node below, record one decision in `src/catalog/figma/registry.json`:",
      "",
      '1. still matches the source → set `status: "implemented"`;',
      "2. must change → update the component and its story in this PR, then set `implemented`;",
      "3. out of scope → set `excluded` with a reason.",
      "",
      "## Instructions — agent handoff",
      "",
      "This pull request is the handoff: a coding agent completes the alignment on this branch.",
      "",
      "- Procedure: follow `AGENTS.md`: the `figma-to-code` skill (Figma delta use case) for the alignment and the `pagopa-ui-standards` skill for every component it touches; Figma stays read-only.",
      "- Inspect each node below in Figma with the Figma MCP (`get_design_context`, `get_screenshot`) or `pnpm nx run pagopa-ui-cli:figma:export` when `FIGMA_TOKEN` is in the environment.",
      "- Record every decision in `src/catalog/figma/registry.json`; an `implemented` entry needs `target.module`, `target.export` and `target.story`, and a story that renders the export.",
      "- The public API is frozen (`src/pagopa-ui.ts`); historical `pending` nodes are reviewed per node on demand, never in bulk.",
      "- Run the verify chain below and report the results. Commit the alignment on this branch; the merge is the review record.",
      "",
      "## Instructions — verify",
      "",
      "Run and report the green chain documented in `CONTRIBUTING.md`:",
      "`pnpm nx run-many -p pagopa-ui -c=ci -t typecheck,fmt,lint,docs,figma:check,foundation:check,layers:check,build,test && pnpm nx run-many -p pagopa-ui-artwork,pagopa-ui-tokens,pagopa-ui-cli -c=ci -t typecheck,fmt,lint && pnpm nx run pagopa-ui-artwork:test && pnpm nx run pagopa-ui-tokens:test && pnpm nx run pagopa-ui-cli:test && pnpm nx run pagopa-ui-storybook:test:coverage && pnpm nx run pagopa-ui-storybook:test:stories && pnpm nx run pagopa-ui-storybook:build && pnpm nx run pagopa-ui:library:check`",
      "",
    )
    for (const [key, label] of classes) {
      const nodes = delta[key]
      if (!nodes.length) continue
      lines.push(`## ${label}`, "")
      for (const node of nodes) {
        const entry = registry.entries[node.nodeId]
        const target = entry?.target
          ? ` · target \`${entry.target.module}#${entry.target.export}\`` +
            (entry.target.story ? ` · story \`${entry.target.story}\`` : "")
          : ""
        lines.push(
          `### ${node.name}`,
          "",
          `- node: \`${node.nodeId}\` · [open in Figma](${figmaNodeLink(node.nodeId)})`,
          `- class: ${key}${node.change ? ` · change: ${node.change}` : ""}`,
          `- page: ${node.pageName}`,
          `- registry status: \`${entry?.status ?? "unaccounted"}\`${target}`,
        )
        // A removed node has no live variants to inspect: the block is a review
        // reminder, and there is nothing left to review.
        if (key !== "removed") lines.push(...renderDevices(node, changedVariants))
        const evidence = evidenceFor(node.nodeId)
        if (evidence.ids.length) {
          lines.push(`- evidence: ${evidence.ids.map((id) => `\`${id}\``).join(" · ")}`)
          if (evidence.links.length) {
            lines.push(
              `  - references: ${evidence.links
                .map((item) => `[${item.id}](${item.href})`)
                .join(" · ")}`,
            )
          }
          lines.push(
            "  - attach the local render after `parity check --case <id> --screenshot <file>`; CI never embeds a component image.",
          )
        }
        lines.push("")
      }
    }
    lines.push(
      "## Artifacts",
      "",
      "- `delta.json`: the machine-readable delta of this run.",
      "- `run.json`: the run metrics (`figmaChangeAt`, `handoffPrAt`, the counts).",
      "- `pr-body.md`: this generated body.",
      "",
      "## Handoff and metrics",
      "",
      "- Local procedure: `docs/figma-drift-handoff.md`.",
      "- `handoffPrAt − figmaChangeAt`: recorded in `run.json`.",
      "- `mergedAt − handoffPrAt`: read after the merge with `gh pr view <number> --json mergedAt`.",
      "",
    )
    return lines.join("\n")
  }

  // The machine-readable delta the workflow uploads with the body: the same
  // classes, the resolved statuses and targets, the work order and the two
  // summaries, so a rerun and the local agent read the same facts.
  function renderDelta() {
    const classes: Array<[NodeDeltaKey, string]> = [
      ["added", "New nodes"],
      ["changed", "Changed nodes"],
      ["renamed", "Renamed identities"],
      ["moved", "Moved identities"],
      ["removed", "Removed nodes"],
      ["affected", "Affected implementations"],
      ["baseline", "Missing design baseline"],
    ]
    const statusOf = (node: InventoryNode): string =>
      entries[node.nodeId]?.status ??
      bulkByNode.get(node.nodeId)?.status ??
      bulkByPage.get(node.pageId)?.status ??
      "unaccounted"
    const selected = new Set([
      ...Object.entries(entries)
        .filter(([, entry]) => entry.status === "pending")
        .map(([id]) => id),
      ...[...delta.added, ...delta.changed, ...delta.affected].map((node) => node.nodeId),
    ])
    for (const id of [...selected]) {
      if (entries[id]?.status === "mocked") selected.delete(id)
    }
    return {
      generatedAt: new Date().toISOString(),
      fileKey: inventory.fileKey,
      liveVersion: liveVersion ?? null,
      counts: Object.fromEntries(classes.map(([key]) => [key, delta[key].length])),
      nodes: Object.fromEntries(
        classes.map(([key]) => [
          key,
          delta[key].map((node) => ({
            nodeId: node.nodeId,
            name: node.name,
            pageName: node.pageName,
            change: node.change ?? null,
            status: statusOf(node),
            target: entries[node.nodeId]?.target ?? null,
          })),
        ]),
      ),
      changedVariants: delta.changedVariants.map((change) => ({
        nodeId: change.nodeId,
        device: change.device ?? null,
        class: change.class,
      })),
      implementationOrder: implementationOrder(live ?? committed, selected),
      devices: deviceStats,
      coverage: deviceCoverageStats,
    }
  }

  if (prBodyPath && !hasDrift && live && !flag("plan")) {
    console.log("drift: none — inventory untouched, no pull request needed")
  }

  if (live && !writeRequested && !prBodyPath) {
    // The variant the change landed in is part of the report: a mobile-only
    // source change must not read as "the node changed" (RA2, gap VG2).
    const changedVariants = new Map(delta.changedVariants.map((change) => [change.nodeId, change]))
    const deviceSuffix = (node: InventoryNode): string => {
      const devices = new Set<string>()
      for (const variant of node.variants ?? []) {
        if (changedVariants.has(variant.nodeId)) {
          devices.add(changedVariants.get(variant.nodeId)?.device ?? "any")
        }
      }
      return devices.size ? ` — devices ${[...devices].join(", ")}` : ""
    }
    const changes: Array<[NodeDeltaKey, string]> = [
      ["added", "NEW"],
      ["removed", "REMOVED"],
      ["changed", "CHANGED"],
      ["renamed", "RENAMED"],
      ["moved", "MOVED"],
      ["baseline", "BASELINE REQUIRED"],
      ["affected", "AFFECTED"],
    ]
    for (const [key, label] of changes) {
      if (delta[key].length)
        fail(
          `${label} nodes (${delta[key].length}):\n` +
            delta[key]
              .map(
                (node) =>
                  `  ${node.nodeId}  ${node.name}${node.change ? ` — ${node.change}` : ""}` +
                  deviceSuffix(node),
              )
              .join("\n"),
        )
    }
    if (!Object.values(delta).some((nodes) => nodes.length) && !flag("plan")) {
      console.log(
        `drift: none (${live.length} live nodes, contracts and design fingerprints match)`,
      )
    }
  }

  // -------------------------------------------------------------- static checks

  const fileKey = fileKeyFromSource()
  if (!fileKey) fail(`${FILE_TS_PATH}: FIGMA_FILE_KEY not found`)
  else if (fileKey !== inventory.fileKey)
    fail(`${FILE_TS_PATH}: FIGMA_FILE_KEY != inventory.fileKey`)

  const syncedAt = Date.parse(inventory.syncedAt)
  if (Number.isFinite(syncedAt)) {
    const ageDays = Math.floor((Date.now() - syncedAt) / 86_400_000)
    if (ageDays > 30) {
      warnings.push(
        `inventory snapshot is ${ageDays} days old — reconcile with the live file (pnpm nx run pagopa-ui-cli:figma:triage)`,
      )
    }
  }

  // ------------------------------------------------------------ device policy

  // RA1: the vocabulary is committed data and the inventory is its evidence. An
  // axis value the policy does not map is an error with the value and the axis in
  // the message; a declared axis nobody uses, a duplicated alias and a note that
  // names no alias are errors too. An alias with no current user only warns: a
  // component can be retired while the vocabulary stays.
  try {
    devicePolicy = loadDevicePolicy()
    const result = checkDevicePolicy(devicePolicy, committed)
    deviceStats = result.stats
    for (const warning of result.warnings) warnings.push(warning)
    for (const error of result.errors) fail(error)
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }

  // ------------------------------------------------------- device coverage (RA4)

  // The corpus is the record of the comparisons; the coverage is what it covers
  // against what the inventory declares. The gate is delta-scoped (RD1): a node
  // whose source changed under it, or that enters the review queue, cannot stay
  // `implemented` without one case per declared device or a reasoned exception.
  // Historical entries are the burn-down work list (`pnpm nx run pagopa-ui-cli:figma:parity:queue
  // --uncovered`), reported as one warning, never as a failure — decision D2 of
  // the hardening handoff stays true for them.
  type CoverageRow = {
    nodeId: string
    missing: string[]
    declared: string[]
    covered: string[]
    drafts: string[]
    status: string
    name: string
    export: string | null
    story: string | null
  }
  type Coverage = {
    rows: CoverageRow[]
    all: CoverageRow[]
    totals: { nodes: number; declared: number; covered: number; missing: number; drafts: number }
  }

  let deviceCoverageStats: {
    sets: number
    covered: number
    missing: number
    drafts: number
    exceptions: number
  } | null = null

  // The case corpus is validated by the catalogue gate, not only by its test
  // project: a malformed case fails the push like a malformed registry entry.
  let caseCorpusStats: {
    cases: number
    errors: number
    warnings: number
    drafts: number
  } | null = null

  if (devicePolicy) {
    try {
      const cases = loadCaseFile()
      const exceptions: Record<string, string> = loadDeviceExceptions()
      const coverage: Coverage = deviceCoverage({
        policy: devicePolicy,
        nodes: committed,
        registry,
        cases,
        statuses: ["implemented"],
      })
      const byNode = new Map<string, CoverageRow>(coverage.all.map((row) => [row.nodeId, row]))
      for (const [nodeId, reason] of Object.entries(exceptions)) {
        if (typeof reason !== "string" || !reason.trim()) {
          fail(`${DEVICE_EXCEPTIONS_PATH}: ${nodeId} requires a reason`)
          continue
        }
        const row = byNode.get(nodeId)
        if (!row) {
          fail(
            `${DEVICE_EXCEPTIONS_PATH}: ${nodeId} is not a registry entry with a device axis — remove the exception`,
          )
        } else if (!row.missing.length) {
          fail(
            `${DEVICE_EXCEPTIONS_PATH}: ${nodeId} covers every declared device — remove the exception`,
          )
        }
      }
      const inDelta = new Set<string>(
        [...delta.added, ...delta.changed, ...delta.affected].map((node) => node.nodeId),
      )
      const uncovered = coverage.rows.filter(
        (row) => row.missing.length && !Object.hasOwn(exceptions, row.nodeId),
      )
      for (const row of uncovered) {
        if (!inDelta.has(row.nodeId)) continue
        fail(
          `device coverage: ${row.nodeId} is in the delta and stays implemented without a case for ` +
            `${row.missing.join(", ")} — save one case per declared device or add a reasoned ` +
            `entry to ${DEVICE_EXCEPTIONS_PATH}`,
        )
      }
      const historical = uncovered.filter((row) => !inDelta.has(row.nodeId))
      if (historical.length) {
        warnings.push(
          `device coverage: ${historical.length} implemented node(s) miss ` +
            `${historical.reduce((count, row) => count + row.missing.length, 0)} device case(s) — ` +
            `the burn-down work list is \`pnpm nx run pagopa-ui-cli:figma:parity:queue --uncovered\``,
        )
      }
      deviceCoverageStats = {
        sets: coverage.rows.length,
        covered: coverage.totals.covered,
        missing: coverage.totals.missing,
        drafts: coverage.totals.drafts,
        exceptions: Object.keys(exceptions).length,
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  }

  // ------------------------------------------------------------ case corpus
  //
  // The reviewed cases are catalogue data too: every case must name a node in
  // the inventory, a device the policy declares and an export the registry maps,
  // with selectors and residue reasons that reproduce. `validateCaseFile` owns
  // the schema; this gate only reports its verdict.
  if (devicePolicy) {
    try {
      const cases = loadCaseFile()
      const result = validateCaseFile(cases, {
        registry,
        nodes: committed,
        policy: devicePolicy,
      })
      for (const error of result.errors) fail(`cases: ${error}`)
      for (const warning of result.warnings) warnings.push(`cases: ${warning}`)
      caseCorpusStats = {
        cases: cases.length,
        errors: result.errors.length,
        warnings: result.warnings.length,
        drafts: cases.filter(isDraftCase).length,
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  }

  const bulkByPage = new Map()
  for (const rule of registry.bulkRules ?? []) {
    if (!/^\d+:\d+$/.test(rule.pageId) || !VALID_STATUSES.has(rule.status ?? ""))
      fail(`bulk rule invalid: ${JSON.stringify(rule)}`)
    else if (bulkByPage.has(rule.pageId)) fail(`duplicate bulk rule for page ${rule.pageId}`)
    else bulkByPage.set(rule.pageId, rule)
    if (rule.status === "excluded" && !rule.reason)
      fail(`bulk rule ${rule.page}: excluded requires reason`)
    if (!rule.namesExport) continue
    if (!rule.assetManifest || !fs.existsSync(artworkPath(rule.assetManifest))) {
      fail(`${rule.page}: namesExport requires an existing node-keyed assetManifest`)
      continue
    }
  }
  const { byNode: bulkByNode, manifests: catalogueManifests } = catalogueIndex(registry)

  const entries = registry.entries ?? {}
  const storiesByFile = new Map()
  const storyImportsByFile = storyImports()
  const allStoryImports = new Set([...storyImportsByFile.values()].flatMap((names) => [...names]))

  // A source node may map to implementations split across modules:
  // `additionalExports` stays in target.module, `additionalTargets` names the
  // (module, export) pairs that live elsewhere.
  function targetIdentities(
    target: NonNullable<RegistryEntry["target"]>,
  ): Array<{ module: string; export: string }> {
    return [
      { module: target.module, export: target.export },
      ...(target.additionalExports ?? []).map((name) => ({
        module: target.module,
        export: name,
      })),
      ...(target.additionalTargets ?? []),
    ]
  }

  for (const [nodeId, entry] of Object.entries(entries)) {
    if (!VALID_STATUSES.has(entry.status))
      fail(`registry ${nodeId}: invalid status ${entry.status}`)
    const node = committedById.get(nodeId)
    if (!node) fail(`registry ${nodeId}: stale entry (node not in ${INVENTORY_PATH})`)
    if (entry.status === "implemented" || entry.status === "mocked") {
      if (!entry.target?.module) fail(`registry ${nodeId}: ${entry.status} requires target.module`)
      else if (!fs.existsSync(absolutePath(entry.target.module))) {
        fail(`registry ${nodeId}: module not found ${entry.target.module}`)
      } else if (!entry.target.export) {
        fail(`registry ${nodeId}: ${entry.status} requires target.export`)
      } else {
        for (const pair of targetIdentities(entry.target)) {
          if (!pair.module || !pair.export) {
            fail(`registry ${nodeId}: additionalTargets require module and export`)
            continue
          }
          if (!fs.existsSync(absolutePath(pair.module))) {
            fail(`registry ${nodeId}: module not found ${pair.module}`)
          } else if (!exportNames(pair.module).has(pair.export)) {
            fail(`registry ${nodeId}: export "${pair.export}" not found in ${pair.module}`)
          }
        }
      }
      if (entry.status === "implemented") {
        if (!entry.target?.story) fail(`registry ${nodeId}: implemented requires target.story`)
        else if (!fs.existsSync(absolutePath(entry.target.story))) {
          fail(`registry ${nodeId}: story not found ${entry.target.story}`)
        }
        if (entry.target?.storyExports) {
          if (!Array.isArray(entry.target.storyExports) || !entry.target.storyExports.length) {
            fail(`registry ${nodeId}: storyExports must be a nonempty list`)
          } else if (entry.target.story && fs.existsSync(entry.target.story)) {
            const storyFile = entry.target.story
            if (!storiesByFile.has(storyFile))
              storiesByFile.set(storyFile, renderedStoryExports(storyFile))
            const stories = storiesByFile.get(storyFile)
            const identities = targetIdentities(entry.target).map((pair) => ({
              ...pair,
              identity: runtimeExports(pair.module).get(pair.export),
            }))
            const expected = identities.map((pair) => pair.identity)
            const rendered = new Set()
            for (const name of entry.target.storyExports) {
              if (
                !stories.has(name) ||
                !expected.some((identity) => stories.get(name).has(identity))
              ) {
                fail(
                  `registry ${nodeId}: story export "${name}" does not render the mapped component`,
                )
              }
              for (const identity of stories.get(name) ?? []) rendered.add(identity)
            }
            for (const pair of identities) {
              if (!rendered.has(pair.identity)) {
                fail(
                  `registry ${nodeId}: declared story exports do not render "${pair.export}" from ${pair.module}`,
                )
              }
            }
          }
        }
      }
      if (entry.status === "implemented" && entry.target?.export) {
        for (const pair of targetIdentities(entry.target)) {
          const declaredImports = entry.target.story
            ? storyImportsByFile.get(entry.target.story)
            : undefined
          const identity = runtimeExports(pair.module).get(pair.export)
          if (!identity) continue
          const verifiedInDeclared = declaredImports?.has(identity) ?? false
          const verifiedAnywhere = allStoryImports.has(identity)
          if (!verifiedAnywhere) {
            if (!Object.hasOwn(evidenceExceptions, nodeId)) {
              fail(
                `registry ${nodeId}: no story renders "${pair.export}" from ${pair.module} — add coverage or list it in ${EVIDENCE_EXCEPTIONS_PATH}`,
              )
            }
          } else if (!verifiedInDeclared) {
            fail(
              `registry ${nodeId}: linked story ${entry.target.story} does not render "${pair.export}" — update target.story`,
            )
          }
        }
      }
      if (entry.status === "mocked" && !entry.note) fail(`registry ${nodeId}: mocked requires note`)
    }
    if (entry.status === "excluded" && !entry.reason)
      fail(`registry ${nodeId}: excluded requires reason`)
  }

  // ----------------------------------------------------- design panel mapping

  // `parameters.design` is the Storybook Design panel contract and mirrors the
  // registry `storyExports` mapping: an implemented node linked to a single story
  // export must appear in that export's effective design (its own or the meta
  // one). Multi-node exports keep the curated choice, and the `pending` queue is
  // not an approval, so neither is enforced.
  const designExpectations = new Map()
  for (const [nodeId, entry] of Object.entries(entries)) {
    if (entry.status !== "implemented" || !entry.target?.story || !entry.target.storyExports)
      continue
    for (const name of entry.target.storyExports) {
      const key = `${entry.target.story}::${name}`
      if (!designExpectations.has(key)) designExpectations.set(key, new Set())
      designExpectations.get(key).add(nodeId)
    }
  }
  const designByFile = new Map()
  for (const [key, nodeIds] of designExpectations) {
    if (nodeIds.size !== 1) continue
    const [file, name] = key.split("::")
    if (!designByFile.has(file)) designByFile.set(file, storyDesignNodes(file))
    const { meta, stories } = designByFile.get(file)
    const effective = stories.get(name) ?? meta
    const [nodeId] = nodeIds
    if (!effective.has(nodeId)) {
      fail(
        `registry ${nodeId}: story export "${name}" in ${file} must show the node in parameters.design`,
      )
    }
  }

  // --------------------------------------------------- story evidence exceptions

  for (const [nodeId, reason] of Object.entries(evidenceExceptions)) {
    const entry = entries[nodeId]
    if (!entry) {
      fail(`${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is not a registry entry`)
      continue
    }
    if (entry.status !== "implemented") {
      fail(`${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is not implemented`)
    }
    if (!reason) fail(`${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} requires a reason`)
    const renderedIdentity = entry.target
      ? moduleExports(entry.target.module).get(entry.target.export)
      : undefined
    if (renderedIdentity && allStoryImports.has(renderedIdentity)) {
      fail(
        `${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is now rendered by a story — remove the exception`,
      )
    }
  }

  // ------------------------------------------------------ reverse API coverage

  const publicExports = collectPublicExports()
  const targetExports = new Set(
    Object.values(entries)
      .flatMap((entry) =>
        entry.target
          ? targetIdentities(entry.target).map((pair) =>
              moduleExports(pair.module).get(pair.export),
            )
          : [],
      )
      .filter(Boolean),
  )
  const modulePatterns = apiExceptions.modulePatterns ?? {}
  const exportExceptions = apiExceptions.exports ?? {}

  for (const [pattern, reason] of Object.entries(modulePatterns)) {
    if (!reason) fail(`${API_EXCEPTIONS_PATH}: module pattern ${pattern} requires a reason`)
    const matched = [...publicExports.values()].some((identity) =>
      matchesModulePattern(identity.split("#")[0], pattern),
    )
    if (!matched) {
      fail(`${API_EXCEPTIONS_PATH}: module pattern ${pattern} matches no public export — remove it`)
    }
  }

  const unsourced: string[] = []
  for (const [name, identity] of publicExports) {
    const file = identity.split("#")[0]
    if (targetExports.has(identity)) continue
    if (Object.entries(modulePatterns).some(([pattern]) => matchesModulePattern(file, pattern))) {
      continue
    }
    if (Object.hasOwn(exportExceptions, name)) continue
    unsourced.push(`${name} (${file})`)
  }
  if (unsourced.length) {
    fail(
      `public exports without a Figma mapping (${unsourced.length}) — map them or list them in ${API_EXCEPTIONS_PATH}:\n` +
        unsourced.map((line) => `  ${line}`).join("\n"),
    )
  }

  for (const [name, reason] of Object.entries(exportExceptions)) {
    if (!reason) fail(`${API_EXCEPTIONS_PATH}: ${name} requires a reason`)
    if (!publicExports.has(name)) {
      fail(`${API_EXCEPTIONS_PATH}: ${name} is not a public export — remove it`)
    } else if (targetExports.has(publicExports.get(name))) {
      fail(`${API_EXCEPTIONS_PATH}: ${name} now maps to a registry entry — remove the exception`)
    }
  }

  const unaccounted: InventoryNode[] = []
  for (const node of committed) {
    if (entries[node.nodeId]) continue
    if (bulkByNode.has(node.nodeId) || bulkByPage.has(node.pageId)) continue
    unaccounted.push(node)
  }
  if (unaccounted.length) {
    fail(
      `unaccounted nodes (${unaccounted.length}) — add registry entries:\n` +
        unaccounted.map((n) => `  ${n.nodeId}  ${n.name}  (${n.pageName})`).join("\n"),
    )
  }

  // The inventory story links each mapped node to its Storybook page from the
  // committed titles: a renamed story is a dead link, not a silent blank.
  for (const problem of staleStoryTitles(registry)) fail(problem)

  // Public catalogue names are stable aliases; source labels are metadata.
  function iconListConstant(name: string): string[] {
    const source = fs.readFileSync(artworkPath(ICONS_PATH), "utf8")
    const block = source.match(new RegExp(`${name} = \\[([\\s\\S]*?)\\] as const`))?.[1] ?? ""
    return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1])
  }
  function compareNames(
    actual: string[],
    expected: string[],
    label: string,
    known: string[] = expected,
  ): void {
    const missing = expected.filter((name) => !actual.includes(name))
    const stale = actual.filter((name) => !known.includes(name))
    if (missing.length) fail(`${label}: missing from ${ICONS_PATH}: ${missing.join(", ")}`)
    if (stale.length) fail(`${label}: stale (no mapped identity): ${stale.join(", ")}`)
  }
  for (const rule of registry.bulkRules ?? []) {
    if (!rule.namesExport) continue
    const manifest = catalogueManifests.get(rule.pageId)
    if (!manifest) continue
    const nodes = committed.filter(
      (node) => (bulkByNode.get(node.nodeId) ?? bulkByPage.get(node.pageId)) === rule,
    )
    const names: string[] = []
    for (const [id, rawAsset] of Object.entries(manifest.entries)) {
      const asset = parseSchema(
        z.looseObject({ name: z.string() }),
        rawAsset,
        `${rule.page}: asset ${id}`,
      )
      if (!nodes.some((node) => node.nodeId === id)) {
        fail(`${rule.page}: stale asset identity ${id}`)
      }
      if (!asset.name.trim() || names.includes(asset.name)) {
        fail(`${rule.page}: ${id} requires a unique public catalogue name`)
      }
      names.push(asset.name)
    }
    const implemented = nodes.filter(
      (node) => (entries[node.nodeId]?.status ?? rule.status) === "implemented",
    )
    for (const node of implemented) {
      if (!manifest.entries[node.nodeId]) {
        fail(`${rule.page}: implemented identity ${node.nodeId} has no source asset mapping`)
      }
    }
    compareNames(
      iconListConstant(rule.namesExport),
      implemented
        .map((node) => {
          const raw = manifest.entries[node.nodeId]
          if (!raw) return undefined
          return parseSchema(
            z.looseObject({ name: z.string().optional() }),
            raw,
            `${rule.page}: asset ${node.nodeId}`,
          ).name
        })
        .filter((name): name is string => typeof name === "string"),
      rule.page ?? rule.pageId,
      names,
    )
  }

  // -------------------------------------------------------------------- summary

  function report() {
    for (const warning of warnings) console.warn(`warn: ${warning}`)
    for (const error of errors) console.error(`error: ${error}`)
    const statuses: Record<string, number> = {}
    for (const node of committed) {
      const entry = entries[node.nodeId]
      const rule = bulkByNode.get(node.nodeId) ?? bulkByPage.get(node.pageId)
      const status = entry?.status ?? rule?.status ?? "unaccounted"
      statuses[status] = (statuses[status] ?? 0) + 1
    }
    console.log(
      `inventory: ${committed.length} nodes | ` +
        Object.entries(statuses)
          .map(([status, count]) => `${status} ${count}`)
          .join(" · "),
    )
    console.log(
      `exceptions: story evidence ${Object.keys(evidenceExceptions).length} · ` +
        `unmapped exports ${Object.keys(apiExceptions.exports ?? {}).length} · ` +
        `device ${deviceCoverageStats?.exceptions ?? 0}`,
    )
    if (deviceStats) console.log(formatDeviceLine(deviceStats))
    if (deviceCoverageStats) console.log(formatCoverageLine(deviceCoverageStats))
    if (caseCorpusStats) {
      console.log(
        `cases: ${caseCorpusStats.cases} case(s) · errors ${caseCorpusStats.errors} · ` +
          `warnings ${caseCorpusStats.warnings} · drafts ${caseCorpusStats.drafts}`,
      )
    }
  }

  if (flag("plan")) {
    const snapshot = live ?? committed
    const selected = new Set([
      ...Object.entries(entries)
        .filter(([, entry]) => entry.status === "pending")
        .map(([id]) => id),
      ...[...delta.added, ...delta.changed, ...delta.affected].map((node) => node.nodeId),
    ])
    // Mocked demos are not implementations to review, even when a dependency
    // change lists them among the affected nodes.
    for (const id of [...selected]) {
      if (entries[id]?.status === "mocked") selected.delete(id)
    }
    // The queue that was already waiting is not today's delta: read it here so
    // a plan reader never mistakes a standing blocker for a new change.
    const designRequest = /\bdocs\/design-requests\/[\w./-]+\.md\b/g
    const pending = Object.entries(entries)
      .filter(([, entry]) => entry.status === "pending")
      .map(([nodeId, entry]) => ({
        nodeId,
        name: snapshot.find((node) => node.nodeId === nodeId)?.name ?? null,
        target: entry.target?.export ?? null,
        designRequests: [...new Set(entry.note?.match(designRequest) ?? [])],
      }))
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId, undefined, { numeric: true }))
    console.log(
      JSON.stringify(
        {
          ...Object.fromEntries(
            Object.entries(delta).map(([key, nodes]) => [
              key,
              // The variant delta is the device-shaped part of the plan: it keeps
              // the device and the class, so a plan reader never sees a bare id.
              key === "changedVariants" ? nodes : nodes.map((node) => node.nodeId),
            ]),
          ),
          snapshotVersion: liveVersion ?? null,
          implementationOrder: implementationOrder(snapshot, selected),
          pending,
          unverifiedDesign: snapshot
            .filter((node) => !node.designFingerprint)
            .map((node) => node.nodeId),
          devices: deviceStats,
          deviceCoverage: deviceCoverageStats,
        },
        null,
        2,
      ),
    )
    for (const error of errors) console.error(`error: ${error}`)
  } else {
    report()
  }
  if (!errors.length) {
    for (const [file, data] of pendingWrites) {
      const temporary = path.join(ROOT, `${file}.${process.pid}.tmp`)
      try {
        fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" })
        fs.renameSync(temporary, path.join(ROOT, file))
      } finally {
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
      }
      if (flag("plan")) console.warn(`validated and written: ${file}`)
      else console.log(`validated and written: ${file}`)
    }
    if (prBodyPath && hasDrift) {
      fs.mkdirSync(path.dirname(path.resolve(ROOT, prBodyPath)), { recursive: true })
      fs.writeFileSync(path.resolve(ROOT, prBodyPath), `${renderPrBody()}\n`)
      console.log(`pr body: ${prBodyPath}`)
    }
    if (deltaPath && live) {
      const target = path.resolve(ROOT, deltaPath)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, `${JSON.stringify(renderDelta(), null, 2)}\n`)
      console.log(`delta: ${deltaPath}`)
    }
  }
  return errors.length ? 1 : 0
}
