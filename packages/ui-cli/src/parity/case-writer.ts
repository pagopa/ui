// Figma parity — writing one case.
//
// The corpus is read as a value (`corpus.ts`); this is the one path that writes
// it. A refined mapping is saved through here, never by hand-editing a command
// line into the report (the pre-2026-10-15 way), so the file keeps one field
// order and one identity rule.

import fs from "node:fs"
import path from "node:path"

import { writeJson } from "../lib/json.ts"
import { forgetCommitted, readCases } from "../records/committed.ts"
import { parseSchema } from "../lib/validate.ts"
import { ParityCaseSchema, type ParityCase } from "../schemas/parity.ts"
import { CASE_FIELDS, caseIdFor, caseKey } from "./corpus.ts"

// Canonical field order, empty collections dropped: the writer and the reviewer
// see the same file.
export function canonicalCase(
  spec: Partial<ParityCase> & Pick<ParityCase, "nodeId">,
  id?: string,
): ParityCase {
  const entry: Record<string, unknown> = {}
  const source: Record<string, unknown> = { ...spec }
  for (const field of CASE_FIELDS) {
    const value = field === "id" ? (id ?? spec.id ?? caseIdFor(spec)) : source[field]
    if (value === undefined || value === null) continue
    if (Array.isArray(value) && !value.length) continue
    if (value === false) continue
    entry[field] = value
  }
  return parseSchema(ParityCaseSchema, entry, "parity case")
}

// Appends or replaces one entry and writes the file back in canonical order.
//
// The id is the corpus identity and the key is the comparison: a refinement
// replaces on either. Without the id rule, gaining a `device` (or a `layoutScope`
// with a device) would change the key and append a second entry under the same
// id — the corpus must stay addressable by `--case <id>` (R5).
export function saveCase(
  file: string,
  spec: Partial<ParityCase> & Pick<ParityCase, "nodeId">,
  { id }: { id?: string } = {},
): { file: string; entry: ParityCase; replaced: boolean; total: number } {
  const cases = [...(readCases(path.dirname(file), path.basename(file)) ?? [])]
  const entry = canonicalCase(spec, id)
  const index = cases.findIndex((item) => item.id === entry.id || caseKey(item) === caseKey(entry))
  if (index >= 0) cases[index] = entry
  else cases.push(entry)
  const ordered = [...cases].sort((a, b) =>
    caseKey(a).localeCompare(caseKey(b), undefined, { numeric: true }),
  )
  fs.mkdirSync(path.dirname(file), { recursive: true })
  writeJson(file, ordered)
  forgetCommitted(file)
  return { file, entry, replaced: index >= 0, total: ordered.length }
}
