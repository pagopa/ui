import { z } from "zod"
import { UsageError } from "../lib/command.ts"

import type { Workspace } from "../adapters/workspace.ts"
import { requiredDevices, variantDevice } from "../figma/devices.ts"
import { parseSchema } from "../lib/validate.ts"
import { readCases } from "../records/committed.ts"
import { compare, compositionSignature, tokenIndex, type SourceSubject } from "./diff.ts"
import { capture as captureStory, DEFAULT_ROOT, type CaptureOptions } from "./render.ts"
import {
  namedLeaves,
  nodeSpec,
  offsetBetween,
  pickVariant,
  sourceNode,
  variantsOf,
  variantsWhere,
  type Project,
  type RawNode,
  type SpecNode,
  type VariantInfo,
} from "./source.ts"

import { devicePolicy, frameBaseline, inventoryNode } from "./context.ts"
import type { CaseReport, CaseSpec, Scope } from "./types.ts"
const SCOPE_PROBES = [360, 1200]
function deviceNarrowing(workspace: Workspace, spec: CaseSpec, node: RawNode): RawNode | undefined {
  if (!spec.device) return undefined
  const inventory = inventoryNode(workspace, spec.nodeId)
  const declared = inventory ? requiredDevices(devicePolicy(workspace), inventory) : []
  if (!declared.length) {
    throw new UsageError(`${spec.nodeId} declares no device: --device has nothing to resolve`)
  }
  if (!declared.includes(spec.device)) {
    throw new UsageError(
      `${spec.nodeId} declares ${declared.join(", ")}: "${spec.device}" is not among them`,
    )
  }
  if (!inventory) throw new UsageError(`${spec.nodeId} is not in inventory.json`)
  return variantsWhere(
    node,
    (name) => variantDevice(devicePolicy(workspace), inventory, name).device === spec.device,
  )
}

// The variant a case captures: `--variant` is explicit, `--device` narrows the
// set, `--state` selects inside it. The resolved device is returned with it so
// the report always names the device it compared.
function resolveVariant(workspace: Workspace, spec: CaseSpec, node: RawNode): VariantInfo {
  if (spec.variant) {
    const variant = pickVariant(node, { variant: spec.variant })
    const inventory = inventoryNode(workspace, spec.nodeId)
    if (spec.device && inventory) {
      const declared = variantDevice(devicePolicy(workspace), inventory, variant.name).device
      if (declared !== spec.device) {
        throw new UsageError(
          `variant ${variant.nodeId} (${variant.name}) declares "${declared ?? "no device"}": ` +
            `it contradicts --device ${spec.device}`,
        )
      }
    }
    return variant
  }
  const narrowed = deviceNarrowing(workspace, spec, node)
  if (narrowed && !(narrowed.children ?? []).length) {
    throw new UsageError(`${spec.nodeId} has no variant that declares "${spec.device}"`)
  }
  return pickVariant(narrowed ?? node, { state: spec.state })
}

function declaredDeviceOf(
  workspace: Workspace,
  spec: CaseSpec,
  variant: VariantInfo,
): string | undefined {
  if (spec.device) return spec.device
  const inventory = inventoryNode(workspace, spec.nodeId)
  if (!inventory) return undefined
  return variantDevice(devicePolicy(workspace), inventory, variant.name).device ?? undefined
}

// The source frames whose padding the case does not compare: the root box alone
// does not prove the inner insets, so the per-node loop names the layers to
// map. Padding only keeps the nudge to the visible insets (the root gap is
// already compared); the reviewer decides which frame drives the composition.
export function mappingGaps(root: SpecNode, mapped: string[]): string[] {
  const names = new Set(mapped)
  const found: string[] = []
  const walk = (node: SpecNode): void => {
    for (const child of node.children ?? []) {
      const padded = Boolean(child.layout?.padding.some((value) => value > 0))
      if (child.type !== "TEXT" && padded && !names.has(child.name)) {
        found.push(`${child.name} (${child.nodeId})`)
      }
      walk(child)
    }
  }
  walk(root)
  return [...new Set(found)]
}

function expectedFrames(workspace: Workspace, nodeId: string, storyId: string): number[] {
  return [
    ...new Set(
      (readCases(workspace.root) ?? [])
        .filter(
          (entry) =>
            entry.nodeId === nodeId &&
            entry.storyId === storyId &&
            entry.layoutScope === "container",
        )
        .map((entry) => Number(entry.width))
        .filter((width) => Number.isFinite(width) && width > 0),
    ),
  ]
}
function frameWaiver(workspace: Workspace, storyId: string) {
  return storyId in frameBaseline(workspace)
}

// One case: the source variant, the story, the subject mapping and the stated
// residues in, the classified report and the probe out.
const CaptureInfoSchema = z.looseObject({
  dpr: z.number(),
  rulerWidth: z.number(),
  rootWidth: z.number(),
  focus: z.string().optional(),
  offsetOrigin: z.string().optional(),
  state: z.looseObject({ state: z.string().optional(), ok: z.boolean().optional() }).optional(),
})

// The source frame the story drew, as the capture reports it (only a waived
// story reaches the caller with `ok: false`).
const SourceFrameReportSchema = z.looseObject({
  ok: z.boolean(),
  expected: z.array(z.number()),
  waived: z.boolean().optional(),
})

export async function evaluateCase(
  workspace: Workspace,
  spec: CaseSpec,
  { project, capture = captureStory }: { project: Project; capture?: typeof captureStory },
): Promise<{
  report: CaseReport
  probe: Record<string, unknown>
  mapping: string[]
  err?: string[]
}> {
  const err: string[] = []
  const node = sourceNode(project, spec.nodeId)
  if (!node) throw new UsageError(`${spec.nodeId} is not in the pinned export`)
  const variant = resolveVariant(workspace, spec, node)
  const variantNode = sourceNode(project, variant.nodeId)
  if (!variantNode) throw new UsageError(`${variant.nodeId} is not in the pinned export`)
  const spec_ = nodeSpec(variantNode, { depth: spec.depth ?? 3 })
  const rootWidth = Number(spec.width ?? variant.box?.width ?? 0)
  if (!rootWidth) throw new UsageError(`${variant.nodeId} has no box: pass a width`)

  const { selectors, sources, sourceOrigin } = sourceMapping(spec, spec_)
  const baseOptions = captureOptions(spec, rootWidth, selectors)
  // The story owes the frame on the base capture only: the scope probes force
  // another element on purpose and would read a frame they just moved.
  const frames = expectedFrames(workspace, spec.nodeId, spec.storyId)
  const probe = await capture({
    ...baseOptions,
    ...(frames.length
      ? { expectFrames: frames, frameWaiver: frameWaiver(workspace, spec.storyId) }
      : {}),
  })
  err.push(...frameWarnings(spec, probe))
  const scope = await captureScope(spec, probe, baseOptions, capture)
  const ignored = (spec.ignores ?? []).map((path_: string) => ({
    path: path_,
    reason: "ignored by the case mapping",
  }))
  const result = compare({
    index: tokenIndex(workspace),
    sources,
    probe,
    subject: {
      interactive: Boolean(spec.interactive),
      compareText: Boolean(spec.compareText),
      compareBox: spec.compareBox,
      compareOffset: spec.compareOffset,
    },
    // The band check reads the layer the case maps to its root element (the
    // variant root, or the `subjectRoot` it narrows to) — its layout mode and
    // its children — so a wrapped band is a number, not an opinion.
    band: sourceOrigin,
    scope,
    residues: [...(spec.residues ?? []), ...ignored],
    strict: Boolean(spec.strict),
  })
  return {
    err,
    report: {
      nodeId: spec.nodeId,
      variant: variant.nodeId,
      variantName: variant.name,
      device: declaredDeviceOf(workspace, spec, variant) ?? null,
      responsive: probe.responsive,
      ...(scope ? { scope } : {}),
      storyId: String(probe.storyId ?? ""),
      variants: variantsOf(node).length,
      capture: probe.capture
        ? parseSchema(CaptureInfoSchema, probe.capture, "capture preflight")
        : undefined,
      ...result,
    },
    probe,
    mapping: mappingGaps(spec_, Object.keys(spec.subjects ?? {})),
  }
}

// The flags of one `check` run as a case spec (the same shape a wave file uses).

function sourceMapping(spec: CaseSpec, spec_: SpecNode) {
  // The story root is always forced to the source width; `root` chooses the
  // element the variant is compared against (the story wrapper only when the
  // component fills it).
  const selectors: Record<string, string> = { field: spec.root ?? DEFAULT_ROOT }
  const rootSubject = spec.subjectRoot ? namedLeaves(spec_, spec.subjectRoot)[0] : undefined
  if (spec.subjectRoot && !rootSubject) {
    throw new UsageError(`${spec.subjectRoot}: no source layer with that name in ${spec_.nodeId}`)
  }
  // The source origin of the composition check: the same layer the case maps to
  // its root element, so the two offsets describe the same relationship.
  const sourceOrigin = rootSubject ?? spec_
  const sources: Record<string, SourceSubject> = {
    field: { ...sourceOrigin, offset: offsetBetween(sourceOrigin, sourceOrigin) },
  }
  for (const [name, selector] of Object.entries(spec.subjects ?? {})) {
    const matches = namedLeaves(spec_, name)
    const leaf = matches.find((item) => item.text) ?? matches[0]
    if (!leaf) throw new UsageError(`${name}: no source layer named "${name}" in ${spec_.nodeId}`)
    sources[name] = { ...leaf, offset: offsetBetween(leaf, sourceOrigin) }
    selectors[name] = selector
  }

  return { selectors, sources, sourceOrigin }
}

function captureOptions(
  spec: CaseSpec,
  rootWidth: number,
  selectors: Record<string, string>,
): CaptureOptions {
  const declaredViewport = Number(spec.viewport ?? rootWidth)
  return {
    storyId: spec.storyId,
    rootWidth,
    viewport: declaredViewport,
    viewportHeight: spec.height ?? 1400,
    rootSelector: DEFAULT_ROOT,
    // The band structure is measured on the element the case maps as its root
    // (the variant-root counterpart), the story root when it maps none.
    bandRoot: spec.root ?? DEFAULT_ROOT,
    subjects: selectors,
    // The offsets are measured from the element the case declares as its root
    // (the variant-root counterpart), or from an explicit origin selector.
    offsetOrigin:
      typeof spec.compareOffset === "string"
        ? spec.compareOffset
        : (spec.offsetOrigin ?? spec.root),
    screenshot: spec.screenshot,
    fill: (spec.fill ?? []).map(([selector, value]) => [selector, value]),
    click: spec.click ?? [],
    focus: spec.focus ?? [],
    blur: Boolean(spec.blur),
    keepFocus: Boolean(spec.keepFocus),
    expectState: spec.expectState,
    stateEvidence: spec.stateEvidence,
  }
}

async function captureScope(
  spec: CaseSpec,
  probe: Record<string, unknown>,
  baseOptions: CaptureOptions,
  capture: typeof captureStory,
): Promise<Scope | undefined> {
  // The far values the declared axis is probed at: both sides, so a scope that
  // only flips at one of them is still confirmed.

  // The declared scope is verified, not trusted (RA5, R4): a viewport-scoped
  // case must change when only the viewport changes, a container-scoped case
  // when only the root width changes at a fixed viewport — at least at one of
  // the far values. A mismatch is a finding: the declaration and the
  // implementation disagree about what decides the composition.
  let scope: Scope | undefined
  if (spec.layoutScope) {
    const base = compositionSignature(probe)
    const axis =
      spec.layoutScope === "viewport"
        ? {
            key: "viewport",
            values: SCOPE_PROBES.filter((value) => value !== baseOptions.viewport),
          }
        : {
            key: "rootWidth",
            values: SCOPE_PROBES.filter((value) => value !== baseOptions.rootWidth),
          }
    const changedAt: number[] = []
    for (const value of axis.values) {
      const other = await capture({
        ...baseOptions,
        ...(axis.key === "viewport"
          ? { viewport: value }
          : {
              // The container the case declares is the element it maps as its
              // root: the capture forces that box, not a component dimension
              // (R1/R4), and the viewport stays fixed.
              rootWidth: value,
              widthTarget: spec.root,
              expectRootWidth: !spec.root,
            }),
        screenshot: undefined,
      })
      if (compositionSignature(other) !== base) changedAt.push(value)
    }
    scope = {
      declared: spec.layoutScope,
      changed: { [axis.key]: changedAt.length > 0 },
      probes: axis.values,
      changedAt,
      widthTarget: axis.key === "rootWidth" ? (spec.root ?? DEFAULT_ROOT) : undefined,
    }
  }

  return scope
}

function frameWarnings(spec: CaseSpec, probe: Record<string, unknown>): string[] {
  const err: string[] = []
  // Only a waived story reaches here without a frame: the reader is told which
  // story still renders another composition than the one the capture measures.
  const frame = SourceFrameReportSchema.safeParse(probe.frame)
  if (frame.success && !frame.data.ok) {
    err.push(
      `warn: ${spec.storyId} does not draw its source frame at ${frame.data.expected.join(" or ")}px ` +
        `(src/catalog/figma/frame-baseline.json): the Storybook render is not the captured composition`,
    )
  }
  return err
}
