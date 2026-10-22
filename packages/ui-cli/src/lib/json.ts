import fs from "node:fs"
import path from "node:path"
import { gzipSync, gunzipSync } from "node:zlib"
import { z } from "zod"

import { parseSchema } from "./validate.ts"

const GZIP_MAGIC = [0x1f, 0x8b]

// A JSON document is accepted either plain or gzipped: the evidence slice is
// committed compressed (it is a large design subtree), while every other file
// stays readable. The magic bytes decide, so a caller never names the format.
function readJsonBytes(file: string): Buffer {
  const bytes = fs.readFileSync(file)
  return bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1] ? gunzipSync(bytes) : bytes
}

export function readJson(file: string): unknown
export function readJson<T>(file: string, schema: z.ZodType<T>): T
export function readJson<T>(file: string, schema?: z.ZodType<T>): T | unknown {
  const value: unknown = JSON.parse(readJsonBytes(file).toString("utf8"))
  return schema ? parseSchema(schema, value, file) : value
}

// The gzipped, minified form a generated artefact is committed in. The gzip
// header carries no timestamp (Node writes zero), so the same content always
// produces the same bytes and an unchanged artefact never churns the diff.
export function gzipJson(value: unknown): Buffer {
  return gzipSync(Buffer.from(`${JSON.stringify(value)}\n`), { level: 9 })
}

export function writeJson(file: string, value: unknown): void {
  writeText(file, `${JSON.stringify(value, null, 2)}\n`)
}

// A write is visible either completely or not at all: a crash mid-write must
// never leave a half manifest that the next check would read as data.
export function writeText(file: string, value: string): void {
  writeBytes(file, Buffer.from(value))
}

export function writeBytes(file: string, value: Buffer): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
  try {
    fs.writeFileSync(temporary, value, { flag: "wx" })
    fs.renameSync(temporary, file)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
}
