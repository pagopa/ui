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

// The consumer DX rules a component can be exempted from, one per contract
// point. The check owns the verdict; the file only records the waiver.
export const CONSUMER_DX_RULES = ["parity", "className", "ref", "attributes", "props type"] as const

export const ConsumerDxExceptionsSchema = z.strictObject({
  schemaVersion: z.literal(1),
  note: z.string().optional(),
  exceptions: z.array(
    z.strictObject({
      component: NonEmptyStringSchema,
      rule: NonEmptyStringSchema,
      reason: NonEmptyStringSchema,
    }),
  ),
})

export type ConsumerDxRule = (typeof CONSUMER_DX_RULES)[number]
