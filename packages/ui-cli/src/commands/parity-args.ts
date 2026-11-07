import type { ParsedArgs } from "citty"
import { UsageError } from "../lib/command.ts"
import type { CheckOptions } from "../parity/types.ts"
import { repeated, text } from "./args.ts"

export const stringArg = { type: "string" } as const
export const booleanArg = { type: "boolean" } as const
export const caseArgs = {
  node: stringArg,
  case: stringArg,
  cases: stringArg,
  input: stringArg,
  state: stringArg,
  variant: stringArg,
  device: stringArg,
  "layout-scope": stringArg,
  story: stringArg,
  export: stringArg,
  width: stringArg,
  root: stringArg,
  "offset-origin": stringArg,
  "subject-root": stringArg,
  subject: stringArg,
  fill: stringArg,
  click: stringArg,
  focus: stringArg,
  blur: booleanArg,
  "keep-focus": booleanArg,
  "expect-state": stringArg,
  "state-evidence": stringArg,
  "compare-text": booleanArg,
  "compare-box": booleanArg,
  "compare-offset": booleanArg,
  interactive: booleanArg,
  strict: booleanArg,
  "save-case": booleanArg,
  note: stringArg,
  residue: stringArg,
  ignore: stringArg,
  viewport: stringArg,
  height: stringArg,
  screenshot: stringArg,
  depth: stringArg,
  notes: booleanArg,
  json: booleanArg,
  devices: booleanArg,
  saved: booleanArg,
} as const

export function pairs(values: string[]): Array<[string, string]> {
  return values.map((value) => {
    const index = value.indexOf("=")
    if (index < 0) throw new UsageError(`${value}: expected key=value`)
    return [value.slice(0, index), value.slice(index + 1)]
  })
}
function nonempty<T>(values: T[]): T[] | undefined {
  return values.length ? values : undefined
}
function box(value: unknown): "height" | "full" | undefined {
  if (value === undefined) return undefined
  if (value === true || value === "") return "height"
  if (value === "height" || value === "full") return value
  throw new UsageError(`--compare-box expects "height" or "full", not ${value}`)
}
function scope(value: unknown): "viewport" | "container" | undefined {
  if (value === undefined) return undefined
  if (value === "viewport" || value === "container") return value
  throw new UsageError(`--layout-scope expects viewport or container, not ${value}`)
}
export function caseOptions(
  args: ParsedArgs<typeof caseArgs>,
  raw: readonly string[],
): CheckOptions {
  const subjects = pairs(repeated(raw, "subject"))
  return {
    nodeId: text(args.node),
    caseId: text(args.case),
    casesFile: text(args.cases),
    input: text(args.input),
    state: text(args.state),
    variant: text(args.variant),
    device: text(args.device)?.trim().toLowerCase(),
    layoutScope: scope(args["layout-scope"]),
    storyId: text(args.story),
    export: text(args.export),
    width: number(args.width, "--width"),
    viewport: number(args.viewport, "--viewport"),
    height: number(args.height, "--height"),
    root: text(args.root),
    subjectRoot: text(args["subject-root"]),
    offsetOrigin: text(args["offset-origin"]),
    subjects: subjects.length ? Object.fromEntries(subjects) : undefined,
    residues: nonempty(pairs(repeated(raw, "residue")).map(([path, reason]) => ({ path, reason }))),
    ignores: nonempty(repeated(raw, "ignore")),
    fill: nonempty(pairs(repeated(raw, "fill"))),
    click: nonempty(repeated(raw, "click")),
    focus: nonempty(repeated(raw, "focus")),
    blur: args.blur || undefined,
    keepFocus: args["keep-focus"] || undefined,
    compareText: args["compare-text"] || undefined,
    compareBox: args["compare-box"]
      ? box(
          args._.find((value) => value === "height" || value === "full") ??
            (args["compare-offset"] ? true : (args._[0] ?? true)),
        )
      : undefined,
    compareOffset: args["compare-offset"]
      ? (args._.find((value) => !args["compare-box"] || (value !== "height" && value !== "full")) ??
        true)
      : text(args["offset-origin"]),
    expectState: text(args["expect-state"]),
    stateEvidence: text(args["state-evidence"]),
    interactive: args.interactive || undefined,
    strict: args.strict || undefined,
    note: text(args.note),
    depth: number(args.depth, "--depth"),
    screenshot: text(args.screenshot),
    saveCase: args["save-case"] || undefined,
    notes: args.notes || undefined,
    json: args.json || undefined,
    devices: args.devices || undefined,
    saved: args.saved || undefined,
  }
}

function number(value: unknown, flag: string): number | undefined {
  const raw = text(value)
  if (raw === undefined) return undefined
  const result = Number(raw)
  if (!Number.isFinite(result)) throw new UsageError(`${flag} needs a finite number, not ${raw}`)
  return result
}
