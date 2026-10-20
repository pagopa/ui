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
