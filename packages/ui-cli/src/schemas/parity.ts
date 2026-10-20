import { z } from "zod"

import { LayoutScopeSchema, NodeIdSchema, NonEmptyStringSchema } from "./common.ts"

const SelectorSchema = z.string().trim().min(1)
const PositiveNumberSchema = z.number().positive()

export const ResidueSchema = z.strictObject({
  path: SelectorSchema,
  reason: SelectorSchema,
})

export const ParityCaseSchema = z.strictObject({
  id: SelectorSchema,
  nodeId: NodeIdSchema,
  export: SelectorSchema,
  storyId: z
    .string()
    .regex(/^[a-z0-9-]+--[a-z0-9-]+$/, "expected a Storybook story id")
    .optional(),
  state: SelectorSchema.optional(),
  device: SelectorSchema.optional(),
  layoutScope: LayoutScopeSchema.optional(),
  variant: NodeIdSchema.optional(),
  width: PositiveNumberSchema.optional(),
  viewport: PositiveNumberSchema.optional(),
  height: PositiveNumberSchema.optional(),
  depth: PositiveNumberSchema.optional(),
  root: SelectorSchema.optional(),
  subjectRoot: SelectorSchema.optional(),
  offsetOrigin: SelectorSchema.optional(),
  subjects: z.record(SelectorSchema, SelectorSchema).optional(),
  fill: z.array(z.tuple([SelectorSchema, z.string()])).optional(),
  click: z.array(SelectorSchema).optional(),
  focus: z.array(SelectorSchema).optional(),
  keepFocus: z.boolean().optional(),
  blur: z.boolean().optional(),
  compareText: z.boolean().optional(),
  compareBox: z.enum(["height", "full"]).optional(),
  compareOffset: z.union([z.boolean(), SelectorSchema]).optional(),
  expectState: SelectorSchema.optional(),
  stateEvidence: SelectorSchema.optional(),
  interactive: z.boolean().optional(),
  residues: z.array(ResidueSchema).optional(),
  ignores: z.array(SelectorSchema).optional(),
  note: z.string().optional(),
})

export const ParityCaseFileSchema = z.array(ParityCaseSchema)

export type ParityCase = z.infer<typeof ParityCaseSchema>
export type Residue = z.infer<typeof ResidueSchema>

// The parity tools also accept a single case file and a summary; these are the
// smallest shapes the command layer needs to trust.
export const ParitySummarySchema = z.record(z.string(), z.unknown())
export const CaseFileSchema = z
  .union([ParityCaseFileSchema, z.strictObject({ cases: ParityCaseFileSchema })])
  .transform((value) => (Array.isArray(value) ? value : value.cases))

export const NonEmptyNoteSchema = NonEmptyStringSchema
