#!/usr/bin/env node
// The bin: the process becomes a context, the tree runs, the code is returned.
// Everything else lives in src/commands (adapters) and the domain modules.
import { processIo } from "./commands/context.ts"

// Captured before the tree loads: a legacy module still changes directory at
// import time (figma/sync.ts), and the context must see the caller's cwd.
const cwd = process.cwd()
const { createContext } = await import("./commands/context.ts")
const { createCli, execute } = await import("./commands/index.ts")

const ctx = createContext({ env: process.env, cwd, io: processIo })
const code = await execute(createCli(ctx), ctx, process.argv.slice(2))
// A legacy group still reports through `process.exitCode`; the larger wins.
process.exitCode = Math.max(Number(process.exitCode ?? 0), code)
