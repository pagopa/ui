import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { parseSchema } from "./validate.ts"

export function readJson(file: string): unknown
export function readJson<T>(file: string, schema: z.ZodType<T>): T
export function readJson<T>(file: string, schema?: z.ZodType<T>): T | unknown {
  const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"))
  return schema ? parseSchema(schema, value, file) : value
}

export function writeJson(file: string, value: unknown): void {
  writeText(file, `${JSON.stringify(value, null, 2)}\n`)
}

// A write is visible either completely or not at all: a crash mid-write must
// never leave a half manifest that the next check would read as data.
export function writeText(file: string, value: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
  try {
    fs.writeFileSync(temporary, value, { flag: "wx" })
    fs.renameSync(temporary, file)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
}
