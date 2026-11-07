// In-process CLI contract runner: the real command tree, a fixture context, the
// output captured. One contract test per command goes through here; the domain
// tests call the domain functions directly.
import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { stripVTControlCharacters } from "node:util"

import { createWorkspace } from "../../src/adapters/workspace.ts"
import { createContext } from "../../src/commands/context.ts"
import { createCli, execute } from "../../src/commands/index.ts"

export async function runCli(argv, { root, cwd = root, env = {} } = {}) {
  const out = []
  const err = []
  const ctx = createContext({
    env: { ...(root ? { PAGOPA_UI_ROOT: root } : {}), ...env },
    cwd: cwd ?? process.cwd(),
    io: { out: (line) => out.push(line), err: (line) => err.push(line) },
  })
  const status = await execute(createCli(ctx), ctx, argv)
  const plain = (lines) => stripVTControlCharacters(lines.join("\n"))
  return { status, stdout: plain(out), stderr: plain(err) }
}

export function workspaceAt(root, env = {}) {
  return createWorkspace({ env: { PAGOPA_UI_ROOT: root, ...env }, cwd: root })
}

// Fixtures live in the package's ignored cache, not the system temporary
// directory. `dispose` removes the tree after each test.
export function fixtureTree(files = {}, prefix = "pagopa-ui-cli-") {
  const root = path.resolve(".cache", "test-fixtures", `${prefix}${randomUUID()}`)
  fs.mkdirSync(root, { recursive: true })
  write(root, { "pnpm-workspace.yaml": "packages: []\n", ...files })
  return {
    root,
    write: (more) => write(root, more),
    dispose: () => fs.rmSync(root, { recursive: true, force: true }),
  }
}

function write(root, files) {
  for (const [file, source] of Object.entries(files)) {
    if (source === null) continue
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, typeof source === "string" ? source : JSON.stringify(source, null, 2))
  }
}
