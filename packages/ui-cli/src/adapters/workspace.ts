// The trees the tooling reads and writes, resolved once per run.
//
// The audited root is the design-system package. `PAGOPA_UI_ROOT` names it
// explicitly (the Nx targets do); otherwise the working directory decides: the
// design-system package itself, the tooling package beside it, or the workspace
// root all resolve to the design system, and any other directory is taken as
// the root itself, which is what the regression fixtures build.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const TOOLING_ROOT = fileURLToPath(new URL("../../", import.meta.url))

const DESIGN_SYSTEM = path.resolve(TOOLING_ROOT, "..", "pagopa-ui")

export interface Workspace {
  /** The audited design-system package. */
  readonly root: string
  /** The directory holding `pnpm-workspace.yaml`, or `root` in a fixture. */
  readonly workspaceRoot: string
  readonly artworkRoot: string
  readonly tokensRoot: string
  readonly storiesRoot: string
  readonly toolingRoot: string
  /** A file identity (`src/…` package-relative, `apps/…`/`packages/…` workspace-relative) as an absolute path. */
  path(identity: string, ...segments: string[]): string
  /** The identity of a real file: package-relative inside the root, workspace-relative elsewhere. */
  identity(file: string): string
}

export interface WorkspaceInput {
  env: NodeJS.ProcessEnv
  cwd: string
}

function real(file: string): string {
  try {
    return fs.realpathSync(file)
  } catch {
    return file
  }
}

function rootFromCwd(cwd: string): string {
  // The tooling package owns a `src` directory too, so it is named first.
  if (real(cwd) === real(TOOLING_ROOT)) return DESIGN_SYSTEM
  if (fs.existsSync(path.join(cwd, "src"))) return cwd
  if (fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"))) return DESIGN_SYSTEM
  return cwd
}

function configured(env: NodeJS.ProcessEnv, name: string, cwd: string): string | undefined {
  const value = env[name]?.trim()
  return value ? path.resolve(cwd, value) : undefined
}

// The artwork and tokens packages sit beside the audited package; a fixture
// tree that owns all of its data falls back to the audited root.
function sibling(root: string, name: string): string {
  const candidate = path.resolve(root, "..", name)
  return fs.existsSync(path.join(candidate, "package.json")) ? candidate : root
}

function findWorkspaceRoot(root: string): string {
  for (let current = root; ;) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current
    const parent = path.dirname(current)
    if (parent === current) return root
    current = parent
  }
}

const posix = (file: string): string => file.split(path.sep).join("/")

export function createWorkspace({ env, cwd }: WorkspaceInput): Workspace {
  // A symlinked root (`/tmp` on macOS) must equal its realpath when an
  // identity is made relative to it.
  const root = real(configured(env, "PAGOPA_UI_ROOT", cwd) ?? rootFromCwd(cwd))
  const workspaceRoot = findWorkspaceRoot(root)
  return {
    root,
    workspaceRoot,
    artworkRoot: configured(env, "PAGOPA_UI_ARTWORK_ROOT", cwd) ?? sibling(root, "artwork"),
    tokensRoot: configured(env, "PAGOPA_UI_TOKENS_ROOT", cwd) ?? sibling(root, "tokens"),
    storiesRoot:
      configured(env, "PAGOPA_UI_STORIES_ROOT", cwd) ?? path.join(workspaceRoot, "apps/storybook"),
    toolingRoot: TOOLING_ROOT,
    path(identity, ...segments) {
      if (path.isAbsolute(identity)) return path.join(identity, ...segments)
      const base =
        identity.startsWith("apps/") || identity.startsWith("packages/") ? workspaceRoot : root
      return path.join(base, identity, ...segments)
    },
    identity(file) {
      const target = real(file)
      const relative = path.relative(root, target)
      if (!relative.startsWith("..")) return posix(relative)
      return posix(path.relative(real(workspaceRoot), target))
    },
  }
}
