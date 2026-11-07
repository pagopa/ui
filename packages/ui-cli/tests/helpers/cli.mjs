// In-process CLI contract runner: the real command tree, a fixture context, the
// output captured. One contract test per command goes through here; the domain
// tests call the domain functions directly.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { stripVTControlCharacters } from "node:util"

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

// A package-shaped fixture tree; `dispose` removes it.
export function fixtureTree(files = {}, prefix = "pagopa-ui-cli-") {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)))
  write(root, files)
  return {
    root,
    write: (more) => write(root, more),
    dispose: () => fs.rmSync(root, { recursive: true, force: true }),
  }
}

function write(root, files) {
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, typeof source === "string" ? source : JSON.stringify(source, null, 2))
  }
}
