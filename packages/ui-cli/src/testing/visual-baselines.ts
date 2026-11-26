// Where the visual baselines live now that git does not carry them.
//
// A baseline is a rendering of a story by a browser, so it is only valid for
// the stories that existed, the engine that drew them and the container image
// that pinned the browser build and the fonts. Those three inputs hash into a
// key, and `pagopa/ui-visual-baselines` stores one directory per key. A run
// fetches the directory its key names, shallowly, into a cache outside the tree:
// the project's history never grows by 28 MB of PNGs and no checkout of the
// project fetches them.
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import type { TestingAdapters } from "../adapters/testing.ts"
import { readJson, writeJson } from "../lib/json.ts"

/** The repository the baseline sets live in. */
export const BASELINES_REPOSITORY = "pagopa/ui-visual-baselines"
/** The directory inside it holding one set per key. */
export const BASELINES_ROOT = "baselines"
/** The fetched set. `.nx` is ignored and survives between runs on one machine. */
export const BASELINES_CACHE = ".nx/visual-baselines"
/** The directory Playwright reads as `VISUAL_SNAPSHOT_DIR`. */
export const BASELINES_SNAPSHOTS = "snapshots"
/** The engine the baselines are captured with. */
export const DEFAULT_ENGINE = "chromium"

const RECORD = "key.json"
const CLONE = "clone"

const StoredRecord = z.object({
  manifest: z.string(),
  engine: z.string(),
  image: z.string(),
  key: z.string(),
  directory: z.string(),
  repository: z.string(),
})

/** A baseline set that cannot be named, fetched or found. */
export class BaselineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BaselineError"
  }
}

export interface VisualBaselineInput {
  /** The built Storybook index, as the bytes the run read. */
  manifest: Buffer | string
  /** The browser engine; `chromium` unless a run says otherwise. */
  engine?: string
  /** The Playwright container image: the renderer the baselines were made by. */
  image: string
}

export interface VisualBaselineKey {
  readonly manifest: string
  readonly engine: string
  readonly image: string
  /** `<manifest>/<engine>/<image>`: the storage path below `BASELINES_ROOT`. */
  readonly key: string
  readonly directory: string
}

export interface StoredVisualBaselines extends VisualBaselineKey {
  readonly repository: string
  readonly snapshots: string
}

export interface FetchBaselinesInput {
  workspace: string
  key: VisualBaselineKey
  /** `owner/name`, a URL or a path; the storage repository by default. */
  repository?: string
  token?: string
  cache?: string
  git: TestingAdapters["git"]
}

export function visualBaselineKey(input: VisualBaselineInput): VisualBaselineKey {
  const manifest = createHash("sha256")
    .update(typeof input.manifest === "string" ? Buffer.from(input.manifest) : input.manifest)
    .digest("hex")
  const engine = engineSegment(input.engine ?? DEFAULT_ENGINE)
  const image = imageSegment(input.image)
  const key = `${manifest}/${engine}/${image}`
  return { manifest, engine, image, key, directory: `${BASELINES_ROOT}/${key}` }
}

export function cacheDirectory(workspace: string): string {
  return path.join(workspace, BASELINES_CACHE)
}

export function snapshotsDirectory(workspace: string, cache = cacheDirectory(workspace)): string {
  return path.join(cache, BASELINES_SNAPSHOTS)
}

/** The set already fetched into the cache, or `null` when there is none. */
export function storedVisualBaselines(
  workspace: string,
  cache = cacheDirectory(workspace),
): StoredVisualBaselines | null {
  const record = path.join(cache, RECORD)
  if (!isFile(record)) return null
  let stored: z.infer<typeof StoredRecord>
  try {
    stored = readJson(record, StoredRecord)
  } catch {
    // A record the fetch did not write is not a baseline: fetch again.
    return null
  }
  const snapshots = snapshotsDirectory(workspace, cache)
  if (!hasImages(snapshots)) return null
  return { ...stored, snapshots }
}

export function fetchVisualBaselines(input: FetchBaselinesInput): StoredVisualBaselines {
  const repository = input.repository?.trim() || BASELINES_REPOSITORY
  const cache = input.cache ?? cacheDirectory(input.workspace)
  const snapshots = snapshotsDirectory(input.workspace, cache)
  const stored = storedVisualBaselines(input.workspace, cache)
  if (stored && stored.key === input.key.key && stored.repository === repository) return stored

  fs.rmSync(snapshots, { recursive: true, force: true })
  fs.rmSync(path.join(cache, RECORD), { force: true })
  const clone = path.join(cache, CLONE)
  fs.rmSync(clone, { recursive: true, force: true })
  try {
    cloneStorage(input, repository, clone)
    const source = path.join(clone, ...input.key.directory.split("/"))
    if (!hasImages(source)) {
      throw new BaselineError(
        `error: ${repository} has no baselines for key ${input.key.key}: ` +
          `the set at ${input.key.directory} is ${isDirectory(source) ? "empty" : "missing"}. ` +
          `Capture it on the pinned Linux image, on a branch of ${repository}, and push it there; ` +
          `macOS never captures a baseline.`,
      )
    }
    fs.cpSync(source, snapshots, { recursive: true })
    const fetched: StoredVisualBaselines = { ...input.key, repository, snapshots }
    writeJson(path.join(cache, RECORD), fetched)
    return fetched
  } finally {
    // The clone is scratch space: a set, not a checkout, is what a run needs.
    fs.rmSync(clone, { recursive: true, force: true })
  }
}

function cloneStorage(input: FetchBaselinesInput, repository: string, clone: string): void {
  const url = cloneUrl(repository, input.token)
  const sparse = input.git(input.workspace, [
    "clone",
    "--depth",
    "1",
    "--filter=blob:none",
    "--sparse",
    url,
    clone,
  ])
  if (sparse.status === 0) {
    // A shared runner's git may ignore the filter; the sparse checkout still
    // keeps everything but the key's directory out of the working tree.
    input.git(input.workspace, ["-C", clone, "sparse-checkout", "set", input.key.directory])
    return
  }
  fs.rmSync(clone, { recursive: true, force: true })
  const plain = input.git(input.workspace, ["clone", "--depth", "1", url, clone])
  if (plain.status === 0) return
  throw new BaselineError(
    `error: cannot fetch ${repository}: ${redact(plain.stderr, input.token).trim()}. ` +
      `Check that the repository exists and that the token can read it.`,
  )
}

function cloneUrl(repository: string, token?: string): string {
  // A URL or a path is used as given: a local directory is storage too.
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) return repository
  if (!token) {
    throw new BaselineError(
      `error: GITHUB_TOKEN is required to fetch ${repository}: set it to a token that can read the baselines`,
    )
  }
  return `https://x-access-token:${token}@github.com/${repository}.git`
}

function redact(text: string, token?: string): string {
  return token ? text.split(token).join("***") : text
}

function engineSegment(engine: string): string {
  const name = engine.trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new BaselineError(
      `error: ${JSON.stringify(engine)} is not a browser engine name: name the engine the baselines are captured with`,
    )
  }
  return name
}

function imageSegment(image: string): string {
  const value = image.trim()
  const digest = /@sha256:([0-9a-f]{64})$/.exec(value)
  if (digest) return `sha256-${digest[1]}`
  const tag = /:([a-z0-9][a-z0-9._-]*)$/.exec(value)
  if (tag) return `tag-${tag[1]}`
  throw new BaselineError(
    `error: ${JSON.stringify(image)} is not pinned: name the Playwright image with an @sha256: digest ` +
      `or a :tag, because the baselines depend on the browser build it carries`,
  )
}

function isFile(file: string): boolean {
  return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ?? false
}

function isDirectory(directory: string): boolean {
  return fs.statSync(directory, { throwIfNoEntry: false })?.isDirectory() ?? false
}

function hasImages(directory: string): boolean {
  if (!isDirectory(directory)) return false
  return fs.readdirSync(directory).some((entry) => entry.endsWith(".png"))
}
