import { UsageError } from "../lib/command.ts"
import type { CaseRow } from "./case-rows.ts"
import type { CaseSpec, DiagnoseOptions } from "./types.ts"

// The flags of one ephemeral `check` run as the spec the comparison needs: the
// registry target supplies the identity and the story, the command line narrows
// it. Nothing here is written down, so a value the flags omit is either the
// target's or the source's — never a stored case.
export function specFromOptions(known: CaseRow, options: DiagnoseOptions): CaseSpec {
  if (!known) throw new UsageError("case: no registry target")
  const storyId_ = options.storyId ?? known.storyIds?.[0]
  if (!storyId_)
    throw new UsageError(`${known?.nodeId ?? "case"}: no declared story export to capture`)
  const exportName = options.export ?? known.export
  if (!exportName) throw new UsageError(`${known.nodeId}: no implementation export to capture`)
  return {
    nodeId: options.nodeId ?? known.nodeId,
    export: exportName,
    storyId: storyId_,
    state: options.state,
    device: options.device,
    layoutScope: options.layoutScope,
    variant: options.variant,
    width: options.width,
    viewport: options.viewport,
    height: options.height,
    depth: Number(options.depth ?? 3),
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
    screenshot: options.screenshot,
  }
}
