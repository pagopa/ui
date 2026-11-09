import fs from "node:fs"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { brotliCompressSync, brotliDecompressSync, constants, gunzipSync } from "node:zlib"
import { z } from "zod"

import { parseSchema } from "./validate.ts"

const GZIP_MAGIC = [0x1f, 0x8b]

export function decodeJsonBytes(bytes: Buffer, file: string): Buffer {
  if (bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1]) return gunzipSync(bytes)
  return file.endsWith(".json.br") ? brotliDecompressSync(bytes) : bytes
}

export function parseJsonBytes(bytes: Buffer, file: string): unknown {
  return JSON.parse(decodeJsonBytes(bytes, file).toString("utf8"))
}

export function readJson(file: string): unknown
export function readJson<T>(file: string, schema: z.ZodType<T>): T
export function readJson<T>(file: string, schema?: z.ZodType<T>): T | unknown {
  const value = parseJsonBytes(fs.readFileSync(file), file)
  return schema ? parseSchema(schema, value, file) : value
}

// Brotli has no timestamp; quality 9 avoids the much slower maximum setting
// while keeping the complete source slice small and deterministic.
export function brotliJson(value: unknown): Buffer {
  return brotliCompressSync(Buffer.from(`${JSON.stringify(value)}\n`), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
  })
}

export interface JsonFormatter {
  readonly binary?: string
  readonly config?: string
}

// The formatter is a development dependency, so a runtime command must not fail
// because it is missing or rejects its input: the write degrades to plain
// two-space JSON, which every reader of a written file can still parse.
export function formatJson(value: unknown, formatter: JsonFormatter = {}): string {
  const input = `${JSON.stringify(value, null, 2)}\n`
  const binary =
    formatter.binary ?? fileURLToPath(new URL("../../node_modules/.bin/oxfmt", import.meta.url))
  const config =
    formatter.config ?? fileURLToPath(new URL("../../../../oxfmt.config.ts", import.meta.url))
  if (!fs.existsSync(binary) || !fs.existsSync(config)) return input
  try {
    return execFileSync(binary, ["--config", config, "--stdin-filepath", "data.json"], {
      input,
      encoding: "utf8",
      maxBuffer: Math.max(Buffer.byteLength(input) * 2, 1024 * 1024),
    })
  } catch {
    return input
  }
}

export function writeJson(file: string, value: unknown, formatter?: JsonFormatter): void {
  writeText(file, formatJson(value, formatter))
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
