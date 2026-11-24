// Figma parity — the reasoned device exceptions.
//
// `device-exceptions.json` is not one of the four records the corpus reads: it
// is a burn-down list beside it, so it lives beside the corpus instead of
// inside it. One node id per entry, a non-empty reason, and nothing else; an
// entry whose node no longer misses a device is an error, not a permission that
// lingers.

import fs from "node:fs"

import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import { DeviceExceptionsSchema } from "../schemas/devices.ts"

export const DEVICE_EXCEPTIONS_PATH = "src/catalog/figma/device-exceptions.json"

export function loadDeviceExceptions(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {}
  return parseSchema(DeviceExceptionsSchema, readJson(file), file)
}

export function validateDeviceExceptions(
  exceptions: Record<string, string>,
  byNode: Map<string, { missing: string[] }>,
  errors: string[],
): void {
  for (const [nodeId, reason] of Object.entries(exceptions)) {
    if (typeof reason !== "string" || !reason.trim()) {
      errors.push(`${DEVICE_EXCEPTIONS_PATH}: ${nodeId} requires a reason`)
      continue
    }
    const row = byNode.get(nodeId)
    if (!row) {
      errors.push(
        `${DEVICE_EXCEPTIONS_PATH}: ${nodeId} is not a registry entry with a device axis — remove the exception`,
      )
    } else if (!row.missing.length) {
      errors.push(
        `${DEVICE_EXCEPTIONS_PATH}: ${nodeId} covers every declared device — remove the exception`,
      )
    }
  }
}
