import { UsageError } from "../lib/command.ts"
// Figma parity — `align`.
//
// One node, one read-only work order: the header the registry and the device
// policy already know, one block per committed case with its verdict and its
// deltas, a Tailwind class hint for every delta that lands on a token, and the
// next command. Nothing is written: saving a case stays `check --save-case`.
import type { Workspace } from "../adapters/workspace.ts"
import { requiredDevices } from "../figma/devices.ts"
import type { ParityCase } from "../schemas/parity.ts"
import { readDevicePolicy, readInventory, readRegistry } from "../records/committed.ts"
import { readCorpus, type CaseCorpus } from "./corpus.ts"
import {
  classify,
  EMPTY_TOKEN_INDEX,
  tokenIndex,
  TOLERANCE,
  type Delta,
  type TokenIndex,
} from "./diff.ts"
import { output, type ParityOutput } from "./output.ts"
import { STORYBOOK_URL } from "./render.ts"

export type AlignOptions = { nodeId: string; casesFile?: string; json?: boolean }

// The part of `check`'s report `align` reads. The evaluator is a parameter so
// the formatter and the missing-case path run without a browser.
export type AlignReport = {
  verdict: string
  deltas: Delta[]
}

export type AlignCaseResult = {
  id: string
  device: string | null
  verdict: string
  deltas: Delta[]
}

export type AlignNode = {
  nodeId: string
  name: string
  status: string
  export: string | null
  story: string | null
  declared: string[]
  covered: string[]
  missing: string[]
  cases: AlignCaseResult[]
}

export type AlignDeps = {
  evaluate: (entry: ParityCase) => Promise<AlignReport>
  storybook: () => Promise<boolean>
  baseUrl?: string
}

const START_STORYBOOK = "pnpm nx run pagopa-ui-storybook:storybook"

// --------------------------------------------------------------- class hints

// The Tailwind utility a spacing token feeds: the property decides the axis.
function spacingUtility(property: string): string | undefined {
  if (property === "padding") return "p"
  if (property === "padding.top") return "pt"
  if (property === "padding.right") return "pr"
  if (property === "padding.bottom") return "pb"
  if (property === "padding.left") return "pl"
  if (property === "gap") return "gap"
  return undefined
}

// The library maps the Figma radius steps onto the Tailwind scale in its theme;
// a step the theme does not name falls back to the token's own name.
const RADIUS_CLASSES: Record<string, string> = {
  "0": "none",
  "8": "lg",
  "16": "xl",
  "24": "3xl",
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// A token belongs to the family its name is built from; a type token that lands
// on a padding delta is a classification detail, not a class to apply.
function matchesFamily(family: "space" | "radius" | "type" | "color", name?: string): boolean {
  if (!name) return false
  if (family === "space") return /^space-\d+$/.test(name)
  if (family === "radius") return /^radius-.+$/.test(name)
  if (family === "type") return /^text-/.test(name)
  return true
}

// The family a property's value is classified against, and the utility prefix
// a token of that family becomes.
function familyOf(property: string): "space" | "radius" | "type" | "color" | undefined {
  if (/^(padding|gap)(\.|$)/.test(property)) return "space"
  if (property === "radius") return "radius"
  if (property === "font.color" || property === "background" || property === "border.color")
    return "color"
  if (property.startsWith("font.") || property === "text") return "type"
  return undefined
}

// The token a source value lands on: the render is what the classification of
// the delta describes, so the hint asks the same vocabulary what the target is.
function sourceToken(
  index: TokenIndex,
  family: "space" | "radius" | "type",
  value: unknown,
  lineHeight?: number,
): Delta["token"] {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined
  const pair = family === "type" && lineHeight != null ? { lineHeight } : {}
  const token = classify(index, family, value, TOLERANCE, pair)
  return token?.kind === "token" || token?.kind === "near-token" ? token : undefined
}

// The Tailwind class a token becomes, when the property maps to one family.
export function classHint(
  property: string,
  token: Delta["token"],
  index: TokenIndex = EMPTY_TOKEN_INDEX,
  lineHeight?: number,
  source?: unknown,
): string | undefined {
  const family = familyOf(property)
  if (!family) return undefined
  // The delta's token describes the render; the hint belongs to the target.
  const classified = family === "color" ? undefined : sourceToken(index, family, source, lineHeight)
  const fallback =
    token && (token.kind === "token" || token.kind === "near-token") ? token : undefined
  const target =
    classified ?? (fallback && matchesFamily(family, fallback.name) ? fallback : undefined)
  const name = target?.name
  if (!name) return undefined
  if (family === "space") {
    const step = /^space-(\d+)$/.exec(name)?.[1]
    const utility = spacingUtility(property)
    return step && utility ? `${utility}-${step}` : undefined
  }
  if (family === "radius") {
    const step = /^radius-(.+)$/.exec(name)?.[1]
    if (!step) return undefined
    return `rounded-${RADIUS_CLASSES[step] ?? step}`
  }
  if (family === "type") {
    return name.startsWith("text-") ? name : `text-${slug(name)}`
  }
  const prefix = property === "background" ? "bg" : property === "border.color" ? "border" : "text"
  return `${prefix}-${slug(name)}`
}

// `<subject>.<property>`: the first segment is the subject, the rest the
// property; a responsive finding is its own subject.
function splitPath(path: string): { subject: string; property: string } {
  const index = path.indexOf(".")
  if (index < 0) return { subject: "", property: path }
  return { subject: path.slice(0, index), property: path.slice(index + 1) }
}

function tokenInfo(path: string, delta: Delta, index: TokenIndex): string {
  const { property } = splitPath(path)
  const family = familyOf(property)
  const source =
    family && family !== "color"
      ? sourceToken(index, family, delta.source, delta.lineHeight)
      : undefined
  const token = source ?? delta.token
  if (!token) return "inline"
  const hint = classHint(property, token, index, delta.lineHeight, delta.source)
  const label = `${token.kind}${token.name ? `: ${token.name}` : ""}`
  return hint ? `${label} → use ${hint}` : label
}

function deltaLine(delta: Delta, index: TokenIndex): string {
  const { subject, property } = splitPath(delta.path)
  const name = subject ? `${subject} ${property}` : property
  return `    ${name}: render ${delta.render} · source ${delta.source} · ${tokenInfo(delta.path, delta, index)}`
}

// ------------------------------------------------------------------ printing

export function formatAlign(node: AlignNode, index: TokenIndex = EMPTY_TOKEN_INDEX): string {
  const lines = [
    `${node.nodeId} ${node.name} · ${node.status} · export ${node.export ?? "-"} · ${node.story ?? "(no story)"}`,
    `  devices: declared ${node.declared.join(",") || "none"} · covered ${node.covered.join(",") || "none"} · ` +
      `missing ${node.missing.join(",") || "none"}`,
  ]
  for (const entry of node.cases) {
    lines.push(`  ${entry.id} [${entry.device ?? "-"}] ${entry.verdict}`)
    for (const delta of entry.deltas) lines.push(deltaLine(delta, index))
  }
  for (const device of node.declared) {
    const cases = node.cases.filter((entry) => entry.device === device)
    for (const entry of cases)
      lines.push(`  check ${device}: pnpm ui-cli parity check --case ${entry.id}`)
    if (!cases.length)
      lines.push(
        `  check ${device}: pnpm ui-cli parity check --node ${node.nodeId} --device ${device} --save-case`,
      )
  }
  const next = nextSteps(node)
  lines.push("Next")
  for (const step of next) lines.push(`  ${step}`)
  return lines.join("\n")
}

// At most three lines: the missing cases, the first accepted delta to record,
// and the clean answer when nothing is left.
export function nextSteps(node: AlignNode): string[] {
  const steps: string[] = []
  if (!node.cases.length || node.missing.length) {
    steps.push(`pnpm ui-cli parity cases --sync --node ${node.nodeId}`)
  }
  const pending = node.cases.find((entry) => entry.deltas.length > 0)
  if (pending) {
    const first = pending.deltas[0]
    steps.push(
      `pnpm ui-cli parity check --case ${pending.id} ` + `--residue "${first.path}=<reason>"`,
    )
  }
  if (!steps.length) steps.push("aligned, no action")
  return steps.slice(0, 3)
}

// ------------------------------------------------------------------- loading

function loadNode(workspace: Workspace, options: AlignOptions, corpus: CaseCorpus): AlignNode {
  const { nodeId } = options
  const inventory = readInventory(workspace.root).components.find((node) => node.nodeId === nodeId)
  if (!inventory) throw new UsageError(`${nodeId} is not in inventory.json`)
  const entry = readRegistry(workspace.root).entries?.[nodeId]
  if (!entry) throw new UsageError(`${nodeId} is not in the registry`)
  const declared = requiredDevices(readDevicePolicy(workspace.root), inventory)
  const covered = declared.filter((device) =>
    corpus.reviewed(nodeId).some((item) => item.device === device),
  )
  return {
    nodeId,
    name: inventory.name,
    status: entry.status,
    export: entry.target?.export ?? null,
    story: entry.target?.story ?? null,
    declared,
    covered,
    missing: declared.filter((device) => !covered.includes(device)),
    cases: [],
  }
}

export async function align(
  workspace: Workspace,
  options: AlignOptions,
  deps: AlignDeps,
): Promise<ParityOutput> {
  const corpus = readCorpus(workspace, options.casesFile)
  const node = loadNode(workspace, options, corpus)
  const cases = corpus.reviewed(options.nodeId)
  if (cases.length && !(await deps.storybook()))
    return output(
      2,
      [],
      [
        `error: no Storybook on ${deps.baseUrl ?? STORYBOOK_URL}; start it with: ${START_STORYBOOK}`,
      ],
    )
  const results: AlignCaseResult[] = []
  for (const entry of cases) {
    const report = await deps.evaluate(entry)
    results.push({
      id: entry.id ?? "",
      device: entry.device ?? null,
      verdict: report.verdict,
      deltas: report.deltas,
    })
  }
  const result: AlignNode = { ...node, cases: results }
  const { cases: _, ...header } = result
  const data = { node: header, cases: result.cases, next: nextSteps(result) }
  return output(
    results.some((entry) => entry.deltas.length > 0) ? 3 : 0,
    options.json
      ? [JSON.stringify(data, null, 2)]
      : [formatAlign(result, result.cases.length ? tokenIndex(workspace) : EMPTY_TOKEN_INDEX)],
    [],
    data,
  )
}
