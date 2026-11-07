// Legacy process-bound path helpers. They read `process.env` and
// `process.cwd()` on every call; new code receives a `Workspace` from the
// command layer instead (src/adapters/workspace.ts), which owns the rules.
import path from "node:path"

import { createWorkspace, TOOLING_ROOT, type Workspace } from "../adapters/workspace.ts"

export { TOOLING_ROOT }

function current(env: NodeJS.ProcessEnv = process.env): Workspace {
  return createWorkspace({ env, cwd: process.cwd() })
}

export const resolveRoot = (env?: NodeJS.ProcessEnv): string => current(env).root
export const resolveArtworkRoot = (env?: NodeJS.ProcessEnv): string => current(env).artworkRoot
export const resolveTokensRoot = (env?: NodeJS.ProcessEnv): string => current(env).tokensRoot
export const resolveWorkspaceRoot = (env?: NodeJS.ProcessEnv): string => current(env).workspaceRoot
export const resolveStoriesRoot = (env?: NodeJS.ProcessEnv): string => current(env).storiesRoot

// Entry points not yet given a `Workspace` keep their package-relative paths
// (`src/…`, `.figma/…`) true by entering the root.
export function enterRoot(env: NodeJS.ProcessEnv = process.env): string {
  const root = resolveRoot(env)
  process.chdir(root)
  return root
}

export const toolingPath = (...segments: string[]): string => path.join(TOOLING_ROOT, ...segments)
export const rootPath = (...segments: string[]): string => path.join(resolveRoot(), ...segments)
export const artworkPath = (...segments: string[]): string =>
  path.join(resolveArtworkRoot(), ...segments)
export const tokensPath = (...segments: string[]): string =>
  path.join(resolveTokensRoot(), ...segments)
export const absolutePath = (file: string): string => current().path(file)
export const fileIdentity = (file: string): string => current().identity(file)

// The environment a regression fixture hands to the scripts it spawns: the
// fixture tree is the root, never the real package the test file lives in.
export function fixtureEnv(root: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { ...process.env, PAGOPA_UI_ROOT: root, ...extra }
}
