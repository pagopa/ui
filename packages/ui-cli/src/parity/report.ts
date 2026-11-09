import fs from "node:fs"
import path from "node:path"
import { UsageError } from "../lib/command.ts"

import type { Workspace } from "../adapters/workspace.ts"
import { markdownTable } from "../lib/markdown.ts"
import { type Delta } from "./diff.ts"

import { output, type ParityOutput } from "./output.ts"
import type { CaseSpec } from "./types.ts"
function reRunCommand(entry: { nodeId: string; case?: CaseSpec; status: string }): string {
  const spec = entry.case
  // A reviewed case is addressed by its id: the corpus owns the mapping.
  if (spec?.id) return `pnpm ui-cli parity check --case ${spec.id}`
  if (!spec) return `pnpm ui-cli parity check --node ${entry.nodeId}`
  const parts = ["pnpm ui-cli parity check", `--node ${entry.nodeId}`]
  if (spec?.state) parts.push(`--state ${spec.state}`)
  if (spec?.device) parts.push(`--device ${spec.device}`)
  if (spec?.layoutScope) parts.push(`--layout-scope ${spec.layoutScope}`)
  if (spec?.variant) parts.push(`--variant ${spec.variant}`)
  if (spec?.storyId) parts.push(`--story ${spec.storyId}`)
  if (spec?.width) parts.push(`--width ${spec.width}`)
  if (spec?.viewport) parts.push(`--viewport ${spec.viewport}`)
  if (spec.height) parts.push(`--height ${spec.height}`)
  if (spec.root) parts.push(`--root ${JSON.stringify(spec.root)}`)
  if (spec.subjectRoot) parts.push(`--subject-root ${JSON.stringify(spec.subjectRoot)}`)
  if (spec.offsetOrigin) parts.push(`--offset-origin ${JSON.stringify(spec.offsetOrigin)}`)
  for (const [layer, selector] of Object.entries(spec.subjects ?? {})) {
    parts.push(`--subject ${JSON.stringify(`${layer}=${selector}`)}`)
  }
  for (const [selector, value] of spec.fill ?? []) {
    parts.push(`--fill ${JSON.stringify(`${selector}=${value}`)}`)
  }
  for (const selector of spec.click ?? []) parts.push(`--click ${JSON.stringify(selector)}`)
  for (const selector of spec.focus ?? []) parts.push(`--focus ${JSON.stringify(selector)}`)
  if (spec.blur) parts.push("--blur")
  if (spec.keepFocus) parts.push("--keep-focus")
  if (spec.compareBox) parts.push(`--compare-box ${spec.compareBox}`)
  if (spec.compareOffset) parts.push("--compare-offset")
  if (spec.expectState) parts.push(`--expect-state ${spec.expectState}`)
  if (spec.stateEvidence) parts.push(`--state-evidence ${JSON.stringify(spec.stateEvidence)}`)
  if (spec.strict) parts.push("--strict")
  for (const residue of spec.residues ?? []) {
    parts.push(`--residue ${JSON.stringify(`${residue.path}=${residue.reason}`)}`)
  }
  for (const ignore of spec.ignores ?? []) parts.push(`--ignore ${ignore}`)
  return parts.join(" ")
}

const DELTA_HEADER = ["node", "path", "source", "render", "token"]

function deltaRow(delta: Delta & { nodeId: string }): string[] {
  return [
    `\`${delta.nodeId}\``,
    `\`${delta.path}\``,
    String(delta.source),
    String(delta.render),
    delta.token ? `${delta.token.kind}${delta.token.name ? `: ${delta.token.name}` : ""}` : "",
  ]
}

// The wave directory becomes one committed markdown: the counts, the per-case
// verdicts with their numbers and the residues with their reasons. The JSON
// stays in the wave directory (gitignored), the markdown is the record.
type SummaryEntry = {
  nodeId: string
  status: string
  file?: string
  device?: string | null
  variant?: string
  variantName?: string
  storyId?: string
  message?: string
  deltas?: number
  advisories?: number
  residues?: number
  responsive?: string
}
type Detail = {
  deltas?: Delta[]
  advisories?: Delta[]
  residues?: Array<{ path: string; reason: string }>
}

type Summary = {
  wave: string
  generatedAt: string
  counts: Record<string, number>
  cases?: SummaryEntry[]
}
export function report(
  workspace: Workspace,
  options: { dir?: string; wave?: string; outDir?: string } = {},
): ParityOutput {
  const out: string[] = []
  const err: string[] = []
  const dir = workspace.path(options.dir ?? ".figma/parity")
  const summaryPath = path.join(dir, "summary.json")
  if (!fs.existsSync(summaryPath))
    throw new UsageError(`${summaryPath} is missing: run capture first`)
  const summary: Summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"))
  const wave = String(options.wave ?? summary.wave)
  const outFile = String(options.outDir ?? `docs/reports/${wave}-figma-parity.md`)

  const entries: SummaryEntry[] = summary.cases ?? []
  const lines = reportHeader(summary, wave, dir, entries)
  const { residuesByReason, deltas, advisories } = reportDetails(dir, entries)
  lines.push(...reportFooter(entries, residuesByReason, deltas, advisories))

  fs.mkdirSync(path.dirname(workspace.path(outFile)), { recursive: true })
  fs.writeFileSync(workspace.path(outFile), `${lines.join("\n")}`)
  out.push(`report written: ${outFile} (${entries.length} case(s))`)
  return output(0, out, err)
}

function reportHeader(
  summary: Summary,
  wave: string,
  dir: string,
  entries: SummaryEntry[],
): string[] {
  const lines: string[] = []
  lines.push(`# Figma parity — wave ${wave}`)
  lines.push("")
  lines.push(
    `Generated by \`pnpm ui-cli parity capture\` + \`report\` on ${summary.generatedAt.slice(0, 10)} ` +
      `from the pinned export and the running Storybook. Evidence: \`${dir}/\` (renders, probes, summary.json).`,
  )
  lines.push("")
  lines.push("## Counts")
  lines.push("")
  lines.push(
    ...markdownTable(
      ["verdict", "cases"],
      Object.entries(summary.counts ?? {}).map(([status, count]) => [status, String(count)]),
    ),
  )
  lines.push("")
  lines.push("## Cases")
  lines.push("")
  lines.push(
    ...markdownTable(
      [
        "node",
        "device",
        "variant",
        "story",
        "verdict",
        "deltas",
        "advisories",
        "residues",
        "responsive",
      ],
      entries.map((entry) => [
        `\`${entry.nodeId}\``,
        entry.device ?? "-",
        entry.variant ? `\`${entry.variant}\`` : "-",
        entry.storyId ? `\`${entry.storyId}\`` : "-",
        `${entry.status}${entry.message ? ` (${entry.message})` : ""}`,
        String(entry.deltas ?? "-"),
        String(entry.advisories ?? "-"),
        String(entry.residues ?? "-"),
        entry.responsive ?? "-",
      ]),
    ),
  )
  lines.push("")

  return lines
}

function reportDetails(dir: string, entries: SummaryEntry[]) {
  const withDetail = entries.filter((entry) => entry.status !== "missing-story")
  const residuesByReason = new Map<string, Array<{ nodeId: string; path: string }>>()
  const deltas: Array<Delta & { nodeId: string }> = []
  const advisories: Array<Delta & { nodeId: string }> = []
  for (const entry of withDetail) {
    const file = path.join(dir, entry.file ?? `${entry.nodeId.replace(":", "-")}.json`)
    if (!fs.existsSync(file)) continue
    const { report: detail }: { report: Detail } = JSON.parse(fs.readFileSync(file, "utf8"))
    for (const delta of detail.deltas ?? []) {
      deltas.push({ nodeId: entry.nodeId, ...delta })
    }
    for (const advisory of detail.advisories ?? []) {
      advisories.push({ nodeId: entry.nodeId, ...advisory })
    }
    for (const residue of detail.residues ?? []) {
      if (!residuesByReason.has(residue.reason)) residuesByReason.set(residue.reason, [])
      residuesByReason.get(residue.reason)?.push({ nodeId: entry.nodeId, path: residue.path })
    }
  }

  return { residuesByReason, deltas, advisories }
}

function reportFooter(
  entries: SummaryEntry[],
  residuesByReason: Map<string, Array<{ nodeId: string; path: string }>>,
  deltas: Array<Delta & { nodeId: string }>,
  advisories: Array<Delta & { nodeId: string }>,
): string[] {
  const lines: string[] = []
  lines.push("## Residues")
  lines.push("")
  if (!residuesByReason.size) lines.push("None: every captured case matched within tolerance.")
  else {
    for (const [reason, items] of residuesByReason) {
      lines.push(`- **${reason}**`)
      for (const item of items) lines.push(`  - \`${item.nodeId}\` \`${item.path}\``)
    }
  }
  lines.push("")
  lines.push("## Deltas still open")
  lines.push("")
  if (!deltas.length) lines.push("None.")
  else {
    lines.push(...markdownTable(DELTA_HEADER, deltas.map(deltaRow)))
  }
  lines.push("")
  lines.push("## Advisories (composition — not gating)")
  lines.push("")
  if (!advisories.length) lines.push("None.")
  else {
    lines.push(
      "Reported by the `--compare-offset` cases; `--strict` promotes them into the verdict.",
    )
    lines.push("")
    lines.push(...markdownTable(DELTA_HEADER, advisories.map(deltaRow)))
  }
  lines.push("")
  lines.push("## How to re-run")
  lines.push("")
  lines.push("```bash")
  for (const entry of entries) lines.push(reRunCommand(entry))
  lines.push("```")
  lines.push("")

  return lines
}
