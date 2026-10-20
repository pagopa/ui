import { z } from "zod"

import { NodeIdSchema, NonEmptyStringSchema } from "./common.ts"

export const PROVENANCE_ORIGINS = ["material-symbols", "custom", "brand", "flaticon"] as const

export const ProvenanceOriginSchema = z.enum(PROVENANCE_ORIGINS)

export const ProvenanceSchema = z.strictObject({
  provider: NonEmptyStringSchema,
  origin: ProvenanceOriginSchema,
  license: NonEmptyStringSchema,
  licenseUrl: NonEmptyStringSchema.optional(),
  sourceUrl: NonEmptyStringSchema.optional(),
  attribution: NonEmptyStringSchema.optional(),
  note: NonEmptyStringSchema.optional(),
})

export const ProvenanceOverridesSchema = z.record(NodeIdSchema, ProvenanceSchema)

export type Provenance = z.infer<typeof ProvenanceSchema>
export type ProvenanceOrigin = z.infer<typeof ProvenanceOriginSchema>
