import { z } from "zod"

import {
  FingerprintSchema,
  NodeIdSchema,
  NonEmptyStringSchema,
  RenderingSchema,
  StatusSchema,
} from "./common.ts"
import { ProvenanceOverridesSchema, ProvenanceSchema } from "./provenance.ts"

// ---------------------------------------------------------------- properties

const VariantPropertySchema = z
  .strictObject({
    type: z.literal("VARIANT"),
    defaultValue: NonEmptyStringSchema,
    variantOptions: z.array(NonEmptyStringSchema).min(1),
  })
  .refine((property) => property.variantOptions.includes(property.defaultValue), {
    message: "the default value must be one of the variant options",
    path: ["defaultValue"],
  })

const BooleanPropertySchema = z.strictObject({
  type: z.literal("BOOLEAN"),
  defaultValue: z.boolean(),
})

const StringPropertySchema = z.strictObject({
  type: z.enum(["TEXT", "INSTANCE_SWAP", "SLOT"]),
  defaultValue: z.string(),
})

export const PropertySchema = z.discriminatedUnion("type", [
  VariantPropertySchema,
  BooleanPropertySchema,
  StringPropertySchema,
])

export type Property = z.infer<typeof PropertySchema>

// ----------------------------------------------------------------- inventory

export const DependencySchema = z.discriminatedUnion("external", [
  z.strictObject({ external: z.literal(false), nodeId: NodeIdSchema }),
  z.strictObject({
    external: z.literal(true),
    assetKey: NonEmptyStringSchema.optional(),
  }),
])

export const VariantSchema = z.strictObject({
  nodeId: NodeIdSchema,
  name: NonEmptyStringSchema,
  device: NonEmptyStringSchema.nullable(),
  box: z
    .strictObject({ width: z.number().nonnegative(), height: z.number().nonnegative() })
    .optional(),
  designFingerprint: FingerprintSchema,
})

export const InventoryNodeSchema = z.strictObject({
  nodeId: NodeIdSchema,
  name: NonEmptyStringSchema,
  type: z.enum(["COMPONENT", "COMPONENT_SET"]),
  pageId: NodeIdSchema,
  pageName: z.string(),
  assetKey: NonEmptyStringSchema.optional(),
  sources: z.array(z.enum(["rest", "mcp"])).optional(),
  properties: z.record(z.string(), PropertySchema).optional(),
  dependencies: z.array(DependencySchema).optional(),
  variants: z.array(VariantSchema).optional(),
  contractFingerprint: FingerprintSchema.optional(),
  designFingerprint: FingerprintSchema.nullable().optional(),
})

export const InventorySchema = z.strictObject({
  schemaVersion: z.number().int().optional(),
  fileKey: NonEmptyStringSchema,
  syncedAt: z.string(),
  // The Figma file version and modification time the inventory was refreshed
  // from: the session report compares them with the live file without reading
  // the pinned snapshot (a full fingerprint comparison stays in `figma sync`).
  fileVersion: NonEmptyStringSchema.optional(),
  lastModified: z.string().optional(),
  components: z.array(InventoryNodeSchema),
})

export type Inventory = z.infer<typeof InventorySchema>
export type InventoryNode = z.infer<typeof InventoryNodeSchema>

// ------------------------------------------------------------------ registry

export const TargetSchema = z.strictObject({
  module: NonEmptyStringSchema,
  export: NonEmptyStringSchema,
  story: NonEmptyStringSchema.optional(),
  storyExports: z.array(NonEmptyStringSchema).optional(),
  additionalExports: z.array(NonEmptyStringSchema).optional(),
  additionalTargets: z
    .array(
      z.strictObject({
        module: NonEmptyStringSchema,
        export: NonEmptyStringSchema,
      }),
    )
    .optional(),
})

export const LocalAssetSchema = z.strictObject({
  rendering: RenderingSchema,
  defaultVariantNodeId: NodeIdSchema.optional(),
  aliases: z.record(NonEmptyStringSchema, NodeIdSchema).optional(),
})

export const RegistryEntrySchema = z.strictObject({
  status: StatusSchema,
  target: TargetSchema.optional(),
  localAsset: LocalAssetSchema.optional(),
  note: z.string().optional(),
  reason: z.string().optional(),
})

export const BulkRuleSchema = z.strictObject({
  pageId: NodeIdSchema,
  page: NonEmptyStringSchema.optional(),
  status: StatusSchema.optional(),
  evidence: NonEmptyStringSchema.optional(),
  namesExport: z.enum(["figmaIconNames", "figmaPictogramNames"]).optional(),
  assetManifest: NonEmptyStringSchema.optional(),
  provenance: ProvenanceSchema.optional(),
  provenanceOverrides: ProvenanceOverridesSchema.optional(),
  note: z.string().optional(),
  reason: z.string().optional(),
})

export const RegistrySchema = z.strictObject({
  bulkRules: z.array(BulkRuleSchema).default([]),
  entries: z.record(NodeIdSchema, RegistryEntrySchema).default({}),
})

export type Registry = z.infer<typeof RegistrySchema>
export type RegistryEntry = z.infer<typeof RegistryEntrySchema>
export type BulkRule = z.infer<typeof BulkRuleSchema>
export type Target = z.infer<typeof TargetSchema>
export type LocalAsset = z.infer<typeof LocalAssetSchema>

// ----------------------------------------------------------- registry notes

// A registry note records the current state and its residues, not the history.
// The limit is fixed here so the baseline file cannot loosen it.
export const NOTE_LENGTH_LIMIT = 600

export const NOTE_LENGTH_BASELINE_PATH = "src/catalog/figma/note-length-baseline.json"

export const NoteLengthBaselineSchema = z.strictObject({
  maxLength: z.number().int().positive(),
  overLimit: z.number().int().nonnegative(),
  note: NonEmptyStringSchema,
})

export type NoteLengthBaseline = z.infer<typeof NoteLengthBaselineSchema>

// The notes the ratchet counts: the entry notes and the rule notes, whichever
// the catalogue carries.
function registryNotes(registry: Registry): string[] {
  return [
    ...Object.values(registry.entries).map((entry) => entry.note),
    ...registry.bulkRules.map((rule) => rule.note),
  ].filter((note): note is string => typeof note === "string")
}

function longNotes(registry: Registry): string[] {
  return registryNotes(registry).filter((note) => note.length > NOTE_LENGTH_LIMIT)
}

// The drift refresh replaces a reviewed note with the pending stub, and the stub
// is shorter: the write that drops the count is the same one that owes the
// ratchet a lower baseline. Never the other way: only a writer shortening notes
// moves the baseline, so no writer can raise it.
export function loweredNoteLengthBaseline(
  registry: Registry,
  baseline: NoteLengthBaseline,
): NoteLengthBaseline | null {
  const long = longNotes(registry).length
  return long < baseline.overLimit ? { ...baseline, overLimit: long } : null
}

// The ratchet: the count of notes past the limit must equal the baseline. A new
// long note fails, and a shortened one asks to lower the baseline, so the count
// only ever goes down.
export function longNoteErrors(
  registry: Registry,
  baseline: NoteLengthBaseline,
  label: string,
): string[] {
  if (baseline.maxLength !== NOTE_LENGTH_LIMIT) {
    return [
      `${label}: maxLength is ${baseline.maxLength}, the limit is ${NOTE_LENGTH_LIMIT} — the limit cannot change`,
    ]
  }
  const long = longNotes(registry).length
  if (long > baseline.overLimit) {
    return [
      `${label}: ${long} registry notes exceed ${NOTE_LENGTH_LIMIT} characters, the baseline allows ${baseline.overLimit} — a note states the current residues, not the history`,
    ]
  }
  if (long < baseline.overLimit) {
    return [
      `${label}: ${long} registry notes exceed ${NOTE_LENGTH_LIMIT} characters, lower overLimit to ${long}`,
    ]
  }
  return []
}

// ---------------------------------------------------------------- exceptions

export const EvidenceExceptionsSchema = z.strictObject({
  storyEvidence: z.record(NonEmptyStringSchema, NonEmptyStringSchema).optional(),
})

export const ApiExceptionsSchema = z.strictObject({
  modulePatterns: z.record(NonEmptyStringSchema, NonEmptyStringSchema),
  exports: z.record(NonEmptyStringSchema, NonEmptyStringSchema),
})

export type EvidenceExceptions = z.infer<typeof EvidenceExceptionsSchema>
export type ApiExceptions = z.infer<typeof ApiExceptionsSchema>

// --------------------------------------------------------------- page surface

// The library export lists the nodes Figma *published*, and the library — not
// the page — is the implementation scope: a helper a designer drew but never
// published is deliberately not a component of this design system. The hole the
// page surface closes is a different one: the export is the only thing the
// procedure ever read, so nothing ever looked at the page as a whole. Three
// things stayed invisible that way:
//
//   * an identity that was *published* but not drawn on the page the census
//     covers — the inventory sees it, and no page read ever asked for it;
//   * an identity drawn on the page but not published, whose only trace is this
//     record: it is out of the implementation scope, and it enters scope the
//     day it is published, which is why publishing it must break a check;
//   * the compositions a page draws — the frame that stacks four elements at
//     852, the mobile page that draws them at 304, the drawer panel at 320 or
//     417 — which no node-level accounting can see and no story necessarily
//     reproduces.
//
// So the record holds, per page read from the page tree (the Figma MCP
// `get_metadata` call on the page node, which sees unpublished frames and
// symbols), every identity drawn on it with the decision the library gives it,
// and every composition with the parity cases that measure it.
//
// The census mirrors the inventory both ways, so the two cannot drift apart
// silently, and `inLibrary` is the hinge: an identity marked in the library must
// be an inventory node, and one marked outside it must not be.
export const SurfaceDecisionSchema = z.enum(
  ["shipped", "mocked", "excluded", "pending", "unpublished"],
  {
    error: "expected shipped, mocked, excluded, pending or unpublished",
  },
)
export type SurfaceDecision = z.infer<typeof SurfaceDecisionSchema>

export const PageIdentitySchema = z.strictObject({
  nodeId: NodeIdSchema,
  name: NonEmptyStringSchema,
  kind: z.enum(["COMPONENT", "COMPONENT_SET"]),
  inLibrary: z.boolean(),
  decision: SurfaceDecisionSchema,
  reason: NonEmptyStringSchema.optional(),
})

export const PageCompositionSchema = z.strictObject({
  nodeId: NodeIdSchema,
  name: NonEmptyStringSchema,
  device: NonEmptyStringSchema,
  // How many times the mapped implementation is drawn in the frame: a stack of
  // four elements is one composition, not four.
  drawn: z.number().int().positive(),
  mirrors: z.array(NonEmptyStringSchema),
  reason: NonEmptyStringSchema.optional(),
})

export const PageSurfacePageSchema = z.strictObject({
  pageId: NodeIdSchema,
  pageName: NonEmptyStringSchema,
  identities: z.array(PageIdentitySchema),
  compositions: z.array(PageCompositionSchema),
})

export const PageSurfaceSchema = z.strictObject({
  fileKey: NonEmptyStringSchema,
  readAt: NonEmptyStringSchema,
  note: NonEmptyStringSchema,
  pages: z.array(PageSurfacePageSchema),
})

export type PageIdentity = z.infer<typeof PageIdentitySchema>
export type PageComposition = z.infer<typeof PageCompositionSchema>
export type PageSurfacePage = z.infer<typeof PageSurfacePageSchema>
export type PageSurface = z.infer<typeof PageSurfaceSchema>
