import { z } from "zod"

// A single place where a schema failure becomes an actionable message. The
// callers own the label (the file or the field), because the same schema is
// reused for reviewed data, fixtures and generated manifests.
export function parseSchema<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    // The repository's diagnostics say "unknown key" rather than Zod's default
    // "Unrecognized key"; the rest of the issue tree is left untouched.
    const detail = z
      .prettifyError(result.error)
      .replace(/^✖\s*/gm, "")
      .replace(/Unrecognized key: "([^"]+)"/g, 'unknown key "$1"')
    throw new Error(`${label}: ${detail}`)
  }
  return result.data
}

// A boolean guard for the few places that need to branch on validity instead
// of throwing. The schema owns the shape; the caller never re-implements it.
export function isSchema<T>(schema: z.ZodType<T>, value: unknown): value is T {
  return schema.safeParse(value).success
}
