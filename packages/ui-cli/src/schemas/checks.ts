import { z } from "zod"

import { NonEmptyStringSchema } from "./common.ts"

export const CSS_METRICS = ["raw", "gzip", "brotli"] as const

const CssMetricsSchema = z.strictObject({
  raw: z.number().optional(),
  gzip: z.number().optional(),
  brotli: z.number().optional(),
})

export const CssBudgetSchema = z.strictObject({
  schemaVersion: z.literal(1),
  note: z.string().optional(),
  metrics: CssMetricsSchema,
})

export type CssBudget = z.infer<typeof CssBudgetSchema>

export const PackageExportsSchema = z.looseObject({
  name: NonEmptyStringSchema,
  exports: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.string())])).optional(),
})
