// The audited root: the package the tooling reads, writes and checks.
//
// The tooling no longer lives inside that package, so the root is explicit:
// the Nx targets pass `PAGOPA_UI_ROOT` (relative to their working directory).
// A bare run resolves it from the tree the caller stands in: the design-system
// package itself, the tooling package next to it, or the workspace root. Any
// other directory is taken as the root itself, which is what the regression
// fixtures do: they build a package-shaped tree and run a script inside it.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const TOOLING_ROOT = fileURLToPath(new URL("../../", import.meta.url))

// The package this tooling audits, named once. The fallback keeps a direct
// `node src/cli.ts` run usable without a flag; the targets never rely on it.
const DESIGN_SYSTEM = path.resolve(TOOLING_ROOT, "..", "pagopa-ui")

function same(left: string, right: string): boolean {
  try {
    return fs.realpathSync(left) === fs.realpathSync(right)
  } catch {
    return false
  }
}

// The working directory names the root when it *is* a package tree: the
// audited package, the tooling package beside it, or the workspace that holds
// both. A fixture tree has neither a workspace manifest nor a sibling package.
function rootFromCwd(): string {
  const cwd = process.cwd()
  // The tooling package now owns a `src` directory too, so it must be named
  // before the generic package-shape test.
  if (same(cwd, TOOLING_ROOT)) return DESIGN_SYSTEM
  if (fs.existsSync(path.join(cwd, "src"))) return cwd
  if (fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"))) return DESIGN_SYSTEM
  return cwd
}

export function resolveRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.PAGOPA_UI_ROOT?.trim()
  const candidate = configured ? path.resolve(configured) : rootFromCwd()
  // A symlinked root (`/tmp` on macOS) must compare equal to its realpath when
  // a source identity is made relative to it.
  try {
    return fs.realpathSync(candidate)
  } catch {
    return candidate
  }
}

// Entry points call this before touching the filesystem: the scripts keep
// their package-relative convention (`src/…`, `.figma/…`), and the explicit
// root makes that convention true from any working directory.
export function enterRoot(env: NodeJS.ProcessEnv = process.env): string {
  const root = resolveRoot(env)
  process.chdir(root)
  return root
}

// A path the tooling owns (fixtures, its own data), independent of the root.
export function toolingPath(...segments: string[]): string {
  return path.join(TOOLING_ROOT, ...segments)
}

// A path inside the audited package, resolved without changing directory. The
// library modules use it for their default paths, so a unit test that imports
// them reads the same tree the command-line entry point audits.
export function rootPath(...segments: string[]): string {
  return path.join(resolveRoot(), ...segments)
}

// The artwork package: the assets and the generated modules the design system
// consumes. It sits beside the audited package; a fixture tree that owns all of
// its data falls back to the audited root, which is what the generators' tests
// build. `PAGOPA_UI_ARTWORK_ROOT` overrides both for a moved checkout.
export function resolveArtworkRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.PAGOPA_UI_ARTWORK_ROOT?.trim()
  if (configured) return path.resolve(configured)
  const sibling = path.resolve(resolveRoot(env), "..", "artwork")
  return fs.existsSync(path.join(sibling, "package.json")) ? sibling : resolveRoot(env)
}

export function artworkPath(...segments: string[]): string {
  return path.join(resolveArtworkRoot(), ...segments)
}

// The tokens package: the design foundations and their generated modules. Same
// convention as the artwork root, with `PAGOPA_UI_TOKENS_ROOT` as the override.
export function resolveTokensRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.PAGOPA_UI_TOKENS_ROOT?.trim()
  if (configured) return path.resolve(configured)
  const sibling = path.resolve(resolveRoot(env), "..", "tokens")
  return fs.existsSync(path.join(sibling, "package.json")) ? sibling : resolveRoot(env)
}

export function tokensPath(...segments: string[]): string {
  return path.join(resolveTokensRoot(), ...segments)
}

// The workspace root: the directory that holds the workspace manifest.
export function resolveWorkspaceRoot(env: NodeJS.ProcessEnv = process.env): string {
  for (let current = resolveRoot(env); ;) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current
    const parent = path.dirname(current)
    if (parent === current) return resolveRoot(env)
    current = parent
  }
}

// The Storybook application: the stories and the guides that document the
// design system, and the Figma catalogue surfaces that render them.
export function resolveStoriesRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.PAGOPA_UI_STORIES_ROOT?.trim()
  if (configured) return path.resolve(configured)
  return path.join(resolveWorkspaceRoot(env), "apps/storybook")
}

// A file identity in this repository is either package-relative (`src/…`, the
// design system) or workspace-relative (`apps/…`, `packages/…`). The prefix
// decides the base, so a story in the app and a component in the package can be
// read by the same check.
export function absolutePath(file: string): string {
  if (path.isAbsolute(file)) return file
  if (file.startsWith("apps/") || file.startsWith("packages/")) {
    return path.join(resolveWorkspaceRoot(), file)
  }
  return path.join(resolveRoot(), file)
}

// The identity of a real file: package-relative inside the design system,
// workspace-relative anywhere else.
export function fileIdentity(file: string): string {
  const real = fs.realpathSync(file)
  const root = fs.realpathSync(resolveRoot())
  const relative = path.relative(root, real)
  if (!relative.startsWith("..")) return relative.split(path.sep).join("/")
  return path.relative(fs.realpathSync(resolveWorkspaceRoot()), real).split(path.sep).join("/")
}

// The environment a regression fixture hands to the scripts it spawns: the
// fixture tree is the root, never the real package the test file lives in.
export function fixtureEnv(root: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { ...process.env, PAGOPA_UI_ROOT: root, ...extra }
}
