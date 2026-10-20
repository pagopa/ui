import { z } from "zod"

// The identities and pinned values the catalogue repeats. A schema owns each
// one, so a typo fails with the field path instead of a hand-written branch.
export const NodeIdSchema = z
  .string()
  .regex(/^\d+:\d+$/, "expected a Figma node id (for example 123:456)")

export const NonEmptyStringSchema = z.string().trim().min(1, "expected a non-empty string")

export const FingerprintSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "expected a lowercase SHA-256 fingerprint")

export const Sha256Schema = FingerprintSchema

export const PinnedVersionSchema = z
  .string({ error: "requires a pinned version" })
  .trim()
  .min(1, { error: "requires a pinned version" })

export const LayoutScopeSchema = z.enum(["viewport", "container"])
export type LayoutScope = z.infer<typeof LayoutScopeSchema>

export const RenderingSchema = z.enum(["image", "mask"])
export type Rendering = z.infer<typeof RenderingSchema>

export const StatusSchema = z.enum(["implemented", "mocked", "excluded", "pending"], {
  error: "invalid status",
})
export type Status = z.infer<typeof StatusSchema>

export const JsonRecordSchema = z.record(z.string(), z.unknown())
