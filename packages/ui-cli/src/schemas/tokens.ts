import { z } from "zod"

import { NonEmptyStringSchema, PinnedVersionSchema } from "./common.ts"

export const FOUNDATION_CATEGORIES = [
  "spacing",
  "size",
  "breakpoint",
  "container",
  "z-index",
  "shadow",
  "radius",
] as const

export const FOUNDATION_SOURCE_KINDS = ["node", "variable", "style", "snapshot", "code"] as const
export const FOUNDATION_ORIGINS = ["figma-asset", "local-extension"] as const
export const ID_KINDS = ["variable", "style", "name"] as const

const TokenValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
])

export const TypographyValueSchema = z.strictObject({
  family: z.string(),
  style: z.string(),
  size: z.number(),
  weight: z.number(),
  lineHeight: z.number(),
  lineHeightUnit: z.enum(["pixels", "multiplier"]),
  letterSpacing: z.number(),
})

export const EffectValueSchema = z.array(
  z.strictObject({
    type: z.string(),
    color: z.string(),
    offset: z.strictObject({ x: z.number(), y: z.number() }),
    radius: z.number(),
    spread: z.number(),
  }),
)

export const TokenEntrySchema = z.strictObject({
  id: NonEmptyStringSchema,
  idKind: z.enum(ID_KINDS),
  idLibrary: z.string().nullable().optional(),
  name: NonEmptyStringSchema,
  type: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN", "EFFECT", "TYPOGRAPHY"]),
  value: TokenValueSchema,
  cssName: NonEmptyStringSchema,
  alias: z.string().optional(),
})

export const FoundationSourceSchema = z.strictObject({
  kind: z.enum(FOUNDATION_SOURCE_KINDS),
  ref: z.string().optional(),
  note: NonEmptyStringSchema.optional(),
})

export const FoundationEntrySchema = z.strictObject({
  id: NonEmptyStringSchema.optional(),
  name: NonEmptyStringSchema,
  type: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN", "EFFECT", "TYPOGRAPHY"]),
  value: TokenValueSchema,
  category: z.enum(FOUNDATION_CATEGORIES),
  origin: z.enum(FOUNDATION_ORIGINS),
  source: FoundationSourceSchema,
  reason: z.string().optional(),
  theme: z
    .strictObject({
      namespace: NonEmptyStringSchema,
      key: NonEmptyStringSchema,
    })
    .optional(),
  cssName: NonEmptyStringSchema.optional(),
})

export const TokenManifestSchema = z.strictObject({
  schemaVersion: z.literal(2),
  fileKey: NonEmptyStringSchema,
  syncedAt: z.string(),
  source: z.record(z.string(), z.unknown()),
  variables: z.record(z.string(), TokenEntrySchema),
  foundations: z.record(z.string(), FoundationEntrySchema),
  excluded: z.record(z.string(), z.string()),
})

export const TokenSnapshotSchema = z.looseObject({
  fileKey: NonEmptyStringSchema,
  syncedAt: z.string().optional(),
  source: z
    .looseObject({
      method: z.string().optional(),
    })
    .optional(),
  ids: z.record(z.string(), z.unknown()).optional(),
  variables: z.record(z.string(), TokenValueSchema),
  foundations: z.record(z.string(), z.unknown()).optional(),
  unresolved: z.record(z.string(), z.unknown()).optional(),
})

export const FoundationsFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  entries: z.record(z.string(), FoundationEntrySchema),
})

export const FoundationBaselineSchema = z.strictObject({
  schemaVersion: z.literal(1),
  note: z.string().optional(),
  counts: z.record(NonEmptyStringSchema, z.number().int().nonnegative()),
})

const RequiredExceptionFieldSchema = z
  .string({ error: "nodeId and reason are required" })
  .trim()
  .min(1, { error: "nodeId and reason are required" })

export const FoundationExceptionSchema = z.strictObject({
  rule: NonEmptyStringSchema,
  file: NonEmptyStringSchema,
  match: NonEmptyStringSchema,
  nodeId: RequiredExceptionFieldSchema,
  reason: RequiredExceptionFieldSchema,
})

export const FoundationExceptionsSchema = z.strictObject({
  schemaVersion: z.literal(1),
  note: z.string().optional(),
  exceptions: z.array(FoundationExceptionSchema),
})

export type TokenManifest = z.infer<typeof TokenManifestSchema>
export type TokenEntry = z.infer<typeof TokenEntrySchema>
export type FoundationEntry = z.infer<typeof FoundationEntrySchema>
export type FoundationException = z.infer<typeof FoundationExceptionSchema>
export type TokenSnapshot = z.infer<typeof TokenSnapshotSchema>

// The manifest is pinned by the source file key and a version; the snapshot
// the token writer consumes is pinned the same way.
export const PinnedTokenSnapshotSchema = TokenSnapshotSchema.extend({
  version: PinnedVersionSchema.optional(),
})
