import fs from "node:fs"

import { parseSync } from "oxc-parser"

// Match the formatter: an identifier key stays bare, everything else is quoted.
export function propertyKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name)
}

// A generated module is compared structurally: formatting and comments may
// change only through the generator, so a hand edit is a check failure.
export function assertGeneratedModule(file: string, expected: string, label: string): void {
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
  const structure = (text: string): string => {
    const parsed = parseSync(file, text)
    if (parsed.errors.length) throw new Error(`Invalid ${label}: ${parsed.errors[0]?.message}`)
    return JSON.stringify(parsed.program, (key, value) =>
      ["start", "end", "raw"].includes(key) ? undefined : value,
    )
  }
  if (structure(current) !== structure(expected)) {
    throw new Error(`${label} does not match the manifest; run --write`)
  }
}
