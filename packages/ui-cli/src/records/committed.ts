// The committed records: the four documents the repository reviews in git —
// the inventory, the registry, the device vocabulary and the reviewed cases.
// One module owns their default paths, their parse posture, their error and a
// process-scoped memory keyed by the resolved file, so no other module reads one
// from disk or keeps a copy of where it lives. Reads only: the writers stay with
// the domain that decides what to write, and invalidating a remembered read is
// their obligation (ADR-0007).
import path from "node:path"
import type { z } from "zod"

import { readJson } from "../lib/json.ts"
import { parseSchema } from "../lib/validate.ts"
import {
  InventorySchema,
  RegistrySchema,
  type Inventory,
  type Registry,
} from "../schemas/catalogue.ts"
import { DevicePolicySchema, type DevicePolicy } from "../schemas/devices.ts"
import { ParityCaseFileSchema, type ParityCase } from "../schemas/parity.ts"

export type CommittedRecord = "inventory" | "registry" | "device-policy" | "cases"

/** Where each record lives, package-relative to the audited root. */
export const COMMITTED_FILES: Readonly<Record<CommittedRecord, string>> = {
  inventory: "src/catalog/figma/inventory.json",
  registry: "src/catalog/figma/registry.json",
  "device-policy": "src/catalog/figma/device-policy.json",
  cases: "src/catalog/figma/parity-cases.json",
}

// The one error a committed record raises: which record, which file, and why.
// A caller never learns it from a bare parse message, and the CLI maps it to a
// repository-state failure rather than a usage mistake.
export class CommittedRecordError extends Error {
  readonly record: CommittedRecord
  readonly file: string
  readonly reason: string

  constructor(record: CommittedRecord, file: string, reason: string) {
    super(`${shown(file)}: ${reason}`)
    this.name = "CommittedRecordError"
    this.record = record
    this.file = file
    this.reason = reason
  }
}

// A path a person can act on: relative when the file sits inside the working
// directory, absolute otherwise. The error object keeps the resolved path.
function shown(file: string): string {
  const relative = path.relative(process.cwd(), file)
  return relative && !relative.startsWith("..") ? relative : file
}

/** The file a record is read from: its committed path, or the caller's override. */
export function committedFile(record: CommittedRecord, root: string, file?: string): string {
  return path.resolve(root, file ?? COMMITTED_FILES[record])
}

// Keyed by the resolved file, scoped to the process: a command reads each
// record once however many modules ask for it, and a second read returns the
// identical value. The read is lazy per record, so a command that needs the
// registry never parses the inventory.
const memory = {
  inventory: new Map<string, Inventory>(),
  registry: new Map<string, Registry>(),
  "device-policy": new Map<string, DevicePolicy>(),
  cases: new Map<string, ParityCase[]>(),
}

// The one way to drop a remembered read, and the writer's obligation: a command
// that changes a record forgets it, so the next read in the same process sees
// the file it just wrote (ADR-0007, RD3).
export function forgetCommitted(file: string): void {
  const key = path.resolve(file)
  for (const store of Object.values(memory)) store.delete(key)
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}

function reasonOf(error: unknown): string {
  if (isMissing(error)) return "not found"
  if (error instanceof SyntaxError) return `invalid JSON (${error.message})`
  return error instanceof Error ? error.message : String(error)
}

// A schema failure names the file so the diagnostic is actionable on its own;
// the error keeps the same file and the detail without it.
function parse<T>(record: CommittedRecord, file: string, schema: z.ZodType<T>, value: unknown): T {
  const label = shown(file)
  try {
    return parseSchema(schema, value, label)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const detail = message.startsWith(`${label}: `) ? message.slice(label.length + 2) : message
    throw new CommittedRecordError(record, file, detail)
  }
}

function read<T>(
  record: CommittedRecord,
  store: Map<string, T>,
  file: string,
  schema: z.ZodType<T>,
): T {
  const key = path.resolve(file)
  const cached = store.get(key)
  if (cached !== undefined) return cached
  let value: unknown
  try {
    value = readJson(key)
  } catch (error) {
    throw new CommittedRecordError(record, key, reasonOf(error))
  }
  const parsed = parse(record, key, schema, value)
  store.set(key, parsed)
  return parsed
}

// Each read names its record once and takes the root, so a caller never pairs a
// record name with a path. The override is the record's path relative to that
// root (or an absolute path), which is how the evidence bundle reads the same
// documents from its own `dataRoot`.
export function readInventory(root: string, file?: string): Inventory {
  return read(
    "inventory",
    memory.inventory,
    committedFile("inventory", root, file),
    InventorySchema,
  )
}

export function readRegistry(root: string, file?: string): Registry {
  return read("registry", memory.registry, committedFile("registry", root, file), RegistrySchema)
}

export function readDevicePolicy(root: string, file?: string): DevicePolicy {
  return read(
    "device-policy",
    memory["device-policy"],
    committedFile("device-policy", root, file),
    DevicePolicySchema,
  )
}

// The one record that may legitimately be absent: a checkout without a reviewed
// corpus is a valid state, and the callers report the resulting coverage instead
// of failing. Every caller handles the `null`; an unreadable file still throws.
export function readCases(root: string, file?: string): ParityCase[] | null {
  const key = committedFile("cases", root, file)
  const cached = memory.cases.get(key)
  if (cached !== undefined) return cached
  let value: unknown
  try {
    value = readJson(key)
  } catch (error) {
    if (isMissing(error)) return null
    throw new CommittedRecordError("cases", key, reasonOf(error))
  }
  const parsed = parse("cases", key, ParityCaseFileSchema, value)
  memory.cases.set(key, parsed)
  return parsed
}
