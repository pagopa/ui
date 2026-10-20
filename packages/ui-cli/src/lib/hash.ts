import { createHash } from "node:crypto"

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex")
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    )
  }
  return value
}

// The fingerprint used by the catalogue: key order and object identity never
// change the evidence, only the content does.
export function fingerprint(value: unknown): string {
  return sha256(JSON.stringify(canonical(value)))
}
