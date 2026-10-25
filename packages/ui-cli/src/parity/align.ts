// Figma parity — `align`.
//
// One node, one read-only work order: the header the registry and the device
// policy already know, one block per committed case with its verdict and its
// deltas, a Tailwind class hint for every delta that lands on a token, and the
// next command. Nothing is written: saving a case stays `check --save-case`.
import { CASES_PATH, isDraftCase, loadCaseFile, loadInventoryNodes, loadRegistry } from "./cases.ts"
import { classify, tokenIndex, TOLERANCE, type Delta, type TokenIndex } from "./diff.ts"
import { loadDevicePolicy, requiredDevices } from "../figma/devices.ts"
import { STORYBOOK_URL } from "./render.ts"
import { rootPath } from "../lib/paths.ts"
import type { ParityCase } from "../schemas/parity.ts"

type Flags = Map<string, string | boolean>
type Parsed = { flags: Flags }

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
  loadNode?: (parsed: Parsed, nodeId: string) => AlignNode
  loadCases?: (parsed: Parsed, nodeId: string) => ParityCase[]
  evaluate?: (entry: ParityCase) => Promise<AlignReport>
  storybook?: () => Promise<boolean>
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
  index: TokenIndex = tokenIndex(),
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

export function formatAlign(node: AlignNode, index: TokenIndex = tokenIndex()): string {
  const lines = [
    `${node.nodeId} ${node.name} · ${node.status} · export ${node.export ?? "-"} · ${node.story ?? "(no story)"}`,
    `  devices: declared ${node.declared.join(",") || "none"} · covered ${node.covered.join(",") || "none"} · ` +
      `missing ${node.missing.join(",") || "none"}`,
  ]
  for (const entry of node.cases) {
    lines.push(`  ${entry.id} [${entry.device ?? "-"}] ${entry.verdict}`)
    for (const delta of entry.deltas) lines.push(deltaLine(delta, index))
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
    steps.push(`pnpm nx run pagopa-ui-cli:figma:parity:cases -- --sync --node ${node.nodeId}`)
  }
  const pending = node.cases.find((entry) => entry.deltas.length > 0)
  if (pending) {
    const first = pending.deltas[0]
    steps.push(
      `pnpm nx run pagopa-ui-cli:figma:parity:check -- --case ${pending.id} ` +
        `--residue "${first.path}=<reason>"`,
    )
  }
  if (!steps.length) steps.push("aligned, no action")
  return steps.slice(0, 3)
}

// ------------------------------------------------------------------- loading

function corpusPath(flags: Flags): string {
  const value = flags.get("cases")
  return typeof value === "string" ? value : rootPath(CASES_PATH)
}

function loadNode(parsed: Parsed, nodeId: string): AlignNode {
  const inventory = loadInventoryNodes().find((node) => node.nodeId === nodeId)
  if (!inventory) throw new Error(`${nodeId} is not in inventory.json`)
  const entry = loadRegistry().entries?.[nodeId]
  if (!entry) throw new Error(`${nodeId} is not in the registry`)
  const declared = requiredDevices(loadDevicePolicy(), inventory)
  const cases = loadCaseFile(corpusPath(parsed.flags)).filter((item) => item.nodeId === nodeId)
  const covered = declared.filter((device) =>
    cases.some((item) => item.device === device && !isDraftCase(item)),
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

async function storybookAnswers(): Promise<boolean> {
  try {
    const response = await fetch(`${STORYBOOK_URL}/index.json`, {
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

// The default evaluator is `check --case`'s own path: the same case spec, the
// same evidence guard and the same capture. It lives in `cli.ts`, which imports
// this module, so it is loaded on demand instead of at module evaluation.
async function cliEvaluate() {
  const { evaluateCase, specFromCase } = await import("./cli.ts")
  const { checkCaseEvidence } = await import("./evidence.ts")
  const { loadExport } = await import("./source.ts")
  const project = loadExport()
  return async (entry: ParityCase): Promise<AlignReport> => {
    const spec = specFromCase(entry, new Map(), {
      flags: new Map(),
      subjects: [],
      residues: [],
      ignores: [],
      fill: [],
      click: [],
      focus: [],
    })
    if (project.raw.kind === "parity-source") {
      const errors = checkCaseEvidence({
        entry: spec,
        node: loadInventoryNodes().find((node) => node.nodeId === entry.nodeId),
      })
      if (errors.length) throw new Error(errors[0])
    }
    const { report } = await evaluateCase(spec, { project })
    return { verdict: report.verdict, deltas: report.deltas }
  }
}

export async function align(parsed: Parsed, deps: AlignDeps = {}): Promise<number> {
  const nodeId = parsed.flags.get("node")
  if (!nodeId || nodeId === true) throw new Error("align requires --node <id>")
  const node = (deps.loadNode ?? loadNode)(parsed, String(nodeId))
  const cases = (
    deps.loadCases ??
    ((parsed_: Parsed, id: string) =>
      loadCaseFile(corpusPath(parsed_.flags)).filter((item) => item.nodeId === id))
  )(parsed, String(nodeId))
  const evaluate = deps.evaluate ?? (await cliEvaluate())
  const answers = deps.storybook ?? storybookAnswers
  if (cases.length && !(await answers())) {
    console.error(`error: no Storybook on ${STORYBOOK_URL}; start it with: ${START_STORYBOOK}`)
    return 2
  }
  const results: AlignCaseResult[] = []
  for (const entry of cases) {
    const report = await evaluate(entry)
    results.push({
      id: entry.id ?? "",
      device: entry.device ?? null,
      verdict: report.verdict,
      deltas: report.deltas,
    })
  }
  const result: AlignNode = { ...node, cases: results }
  if (parsed.flags.has("json")) {
    console.log(
      JSON.stringify(
        {
          node: {
            nodeId: result.nodeId,
            name: result.name,
            status: result.status,
            export: result.export,
            story: result.story,
            declared: result.declared,
            covered: result.covered,
            missing: result.missing,
          },
          cases: result.cases,
          next: nextSteps(result),
        },
        null,
        2,
      ),
    )
  } else {
    console.log(formatAlign(result))
  }
  return results.some((entry) => entry.deltas.length > 0) ? 1 : 0
}
