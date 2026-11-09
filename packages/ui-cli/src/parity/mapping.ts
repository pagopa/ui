import { UsageError } from "../lib/command.ts"
import type { ParityCase } from "../schemas/parity.ts"
import type { CaseRow } from "./cases.ts"
import type { CaseSpec, CheckOptions } from "./types.ts"

export function caseFromOptions(known: CaseRow, options: CheckOptions): CaseSpec {
  const storyId = options.storyId ?? known?.storyIds?.[0]
  if (!storyId)
    throw new UsageError(`${known?.nodeId ?? "case"}: no declared story export to capture`)
  if (!known) throw new UsageError("case: no registry target")
  const exportName = options.export ?? known.export
  if (!exportName) throw new UsageError(`${known.nodeId}: no implementation export to capture`)
  return {
    nodeId: options.nodeId ?? known.nodeId,
    export: exportName,
    storyId,
    state: options.state,
    device: options.device,
    layoutScope: options.layoutScope,
    variant: options.variant,
    // The corpus validator wants numbers: a saved case must not carry the raw
    // command-line strings.
    width: options.width,
    viewport: options.viewport,
    height: options.height,
    root: options.root,
    subjectRoot: options.subjectRoot,
    offsetOrigin: options.offsetOrigin,
    subjects: options.subjects ?? {},
    residues: options.residues ?? [],
    ignores: options.ignores ?? [],
    fill: options.fill ?? [],
    click: options.click ?? [],
    focus: options.focus ?? [],
    blur: Boolean(options.blur),
    keepFocus: Boolean(options.keepFocus),
    compareText: Boolean(options.compareText),
    compareBox: options.compareBox,
    compareOffset: options.compareOffset,
    expectState: options.expectState,
    stateEvidence: options.stateEvidence,
    interactive: Boolean(options.interactive),
    strict: Boolean(options.strict),
    note: options.note,
    depth: Number(options.depth ?? 3),
    screenshot: options.screenshot,
  }
}

export function specFromCase(entry: ParityCase, options: CheckOptions = {}): CaseSpec {
  const storyId = options.storyId ?? entry.storyId ?? ""
  return {
    ...entry,
    nodeId: String(options.nodeId ?? entry.nodeId),
    storyId: String(storyId),
    state: options.state ?? entry.state,
    device: options.device ?? entry.device,
    layoutScope: options.layoutScope ?? entry.layoutScope,
    variant: options.variant ?? entry.variant,
    width: options.width ?? entry.width,
    viewport: options.viewport ?? entry.viewport,
    height: options.height ?? entry.height,
    root: options.root ?? entry.root,
    subjectRoot: options.subjectRoot ?? entry.subjectRoot,
    offsetOrigin: options.offsetOrigin ?? entry.offsetOrigin,
    subjects: options.subjects !== undefined ? (options.subjects ?? {}) : (entry.subjects ?? {}),
    residues: options.residues !== undefined ? (options.residues ?? []) : (entry.residues ?? []),
    ignores: options.ignores !== undefined ? (options.ignores ?? []) : (entry.ignores ?? []),
    fill: options.fill !== undefined ? (options.fill ?? []) : (entry.fill ?? []),
    click: options.click !== undefined ? (options.click ?? []) : (entry.click ?? []),
    focus: options.focus !== undefined ? (options.focus ?? []) : (entry.focus ?? []),
    blur: options.blur !== undefined ? options.blur : entry.blur,
    keepFocus: options.keepFocus !== undefined ? options.keepFocus : entry.keepFocus,
    interactive: options.interactive !== undefined ? options.interactive : entry.interactive,
    compareText: options.compareText !== undefined ? options.compareText : entry.compareText,
    compareBox: options.compareBox !== undefined ? options.compareBox : entry.compareBox,
    compareOffset:
      options.compareOffset !== undefined || options.offsetOrigin !== undefined
        ? (options.compareOffset ?? options.offsetOrigin)
        : entry.compareOffset,
    expectState: options.expectState ?? entry.expectState,
    stateEvidence: options.stateEvidence ?? entry.stateEvidence,
    // The note a case already carries stays unless `--note <text>` replaces it:
    // a draft stops being a draft exactly through this flag.
    note: options.note ?? entry.note,
    strict: options.strict !== undefined ? options.strict : undefined,
    depth: Number(options.depth ?? entry.depth ?? 3),
    screenshot: options.screenshot,
  }
}
