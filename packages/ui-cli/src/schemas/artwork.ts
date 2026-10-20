import { z } from "zod"

import {
  FingerprintSchema,
  NodeIdSchema,
  NonEmptyStringSchema,
  PinnedVersionSchema,
  RenderingSchema,
  Sha256Schema,
} from "./common.ts"
import { ProvenanceSchema } from "./provenance.ts"

export const VariantAssetSchema = z.strictObject({
  nodeId: NodeIdSchema,
  file: z.string().regex(/^\d+-\d+\.svg$/, "expected <nodeId>.svg"),
  sha256: Sha256Schema.optional(),
})

export const IconManifestEntrySchema = z.strictObject({
  name: NonEmptyStringSchema,
  rendering: RenderingSchema,
  kind: z.enum(["logo", "glyph"]),
  designFingerprint: FingerprintSchema,
  contractFingerprint: FingerprintSchema,
  defaultVariantNodeId: NodeIdSchema,
  aliases: z.record(NonEmptyStringSchema, NodeIdSchema),
  provenance: ProvenanceSchema,
  variants: z.record(NodeIdSchema, VariantAssetSchema),
})

export const IconManifestSchema = z.strictObject({
  fileKey: NonEmptyStringSchema,
  version: PinnedVersionSchema,
  entries: z.record(NodeIdSchema, IconManifestEntrySchema),
})

export const PictogramManifestEntrySchema = z.strictObject({
  name: NonEmptyStringSchema,
  designFingerprint: FingerprintSchema,
  light: VariantAssetSchema,
  dark: VariantAssetSchema,
  provenance: ProvenanceSchema,
})

export const PictogramManifestSchema = z.strictObject({
  fileKey: NonEmptyStringSchema,
  version: PinnedVersionSchema,
  entries: z.record(NodeIdSchema, PictogramManifestEntrySchema),
})

export type IconManifest = z.infer<typeof IconManifestSchema>
export type IconManifestEntry = z.infer<typeof IconManifestEntrySchema>
export type PictogramManifest = z.infer<typeof PictogramManifestSchema>
export type PictogramManifestEntry = z.infer<typeof PictogramManifestEntrySchema>
export type VariantAsset = z.infer<typeof VariantAssetSchema>
