import { execFileSync, spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import type { Workspace } from "./workspace.ts"

function git(workspace: Workspace, args: string[]): string {
  return execFileSync("git", args, {
    cwd: workspace.workspaceRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}
function oldJson(workspace: Workspace, base: string, file: string, run: typeof git): unknown {
  try {
    return JSON.parse(run(workspace, ["show", `${base}:${file}`]))
  } catch {
    return null
  }
}
function currentJson(workspace: Workspace, file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(workspace.workspaceRoot, file), "utf8"))
  } catch {
    return null
  }
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}
function cases(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const items = object(value).cases
  return Array.isArray(items) ? items : []
}
export function gitChanges(workspace: Workspace, requestedBase?: string, run: typeof git = git) {
  const base = requestedBase ?? run(workspace, ["merge-base", "HEAD", "origin/main"])
  const files = run(workspace, ["diff", "--name-only", base]).split("\n").filter(Boolean)
  const registry = "packages/pagopa-ui/src/catalog/figma/registry.json"
  const caseFile = "packages/pagopa-ui/src/catalog/figma/parity-cases.json"
  const before = object(object(oldJson(workspace, base, registry, run)).entries)
  const after = object(object(currentJson(workspace, registry)).entries)
  const nodes = new Set(
    Object.keys({ ...before, ...after }).filter(
      (id) => JSON.stringify(before[id]) !== JSON.stringify(after[id]),
    ),
  )
  const oldCases = cases(oldJson(workspace, base, caseFile, run)).map(object)
  const newCases = cases(currentJson(workspace, caseFile)).map(object)
  const oldById = new Map(oldCases.map((item) => [item.id, item]))
  const newById = new Map(newCases.map((item) => [item.id, item]))
  for (const id of new Set([...oldById.keys(), ...newById.keys()])) {
    const old = oldById.get(id),
      next = newById.get(id)
    if (JSON.stringify(old) !== JSON.stringify(next))
      for (const item of [old, next]) if (typeof item?.nodeId === "string") nodes.add(item.nodeId)
  }
  return { base, files, nodes: [...nodes].sort() }
}
export function runGreenChain(
  workspace: Workspace,
  env: NodeJS.ProcessEnv,
  log: (line: string) => void,
): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("pnpm", ["nx", "run", "workspace:verify"], {
      cwd: workspace.workspaceRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    child.stdout.on("data", (data: Buffer) => log(data.toString()))
    child.stderr.on("data", (data: Buffer) => log(data.toString()))
    child.on("error", () => resolve(1))
    child.on("close", (code) => resolve(code ?? 1))
  })
}
