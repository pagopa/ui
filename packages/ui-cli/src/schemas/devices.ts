import { z } from "zod"

import { NonEmptyStringSchema } from "./common.ts"

export const ANY_DEVICE = "any"
export const UNKNOWN_DEVICE = "unknown"

export const DeviceKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "expected a lowercase device key")

export const DeviceDefinitionSchema = z
  .strictObject({
    aliases: z.array(NonEmptyStringSchema).min(1, "aliases must be a non-empty list of names"),
    canonicalWidth: z.custom<number>(
      (value) => typeof value === "number" && Number.isInteger(value) && value > 0,
      { error: "canonicalWidth must be a positive integer" },
    ),
    defaultLayoutScope: z.enum(["viewport", "container"], {
      error: "defaultLayoutScope must be one of viewport | container",
    }),
    notes: z.record(z.string(), NonEmptyStringSchema).optional(),
  })
  .superRefine((definition, context) => {
    for (const alias of Object.keys(definition.notes ?? {})) {
      if (!definition.aliases.includes(alias)) {
        context.addIssue({
          code: "custom",
          message: `notes names "${alias}", which is not one of its aliases`,
          path: ["notes", alias],
        })
      }
    }
  })

export const DevicePolicySchema = z
  .strictObject({
    axes: z.array(NonEmptyStringSchema),
    any: z.array(z.string()),
    devices: z.record(DeviceKeySchema, DeviceDefinitionSchema),
  })
  .superRefine((policy, context) => {
    if (!Object.keys(policy.devices).length) {
      context.addIssue({
        code: "custom",
        message: "devices must be a non-empty object",
        path: ["devices"],
      })
    }
  })

export type DevicePolicy = z.infer<typeof DevicePolicySchema>
export type DeviceDefinition = z.infer<typeof DeviceDefinitionSchema>

export const DeviceExceptionsSchema = z.record(
  z.string().regex(/^\d+:\d+$/, "expected a Figma node id"),
  z.string(),
)
