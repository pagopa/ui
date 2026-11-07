#!/usr/bin/env node
// The bin: the process becomes a context, the tree runs, the code is returned.
// Everything else lives in src/commands (adapters) and the domain modules.
import { createContext, processIo } from "./commands/context.ts"
import { createCli, execute } from "./commands/index.ts"

const ctx = createContext({ env: process.env, cwd: process.cwd(), io: processIo })
const code = await execute(createCli(ctx), ctx, process.argv.slice(2))
// A legacy group still reports through `process.exitCode`; the larger wins.
process.exitCode = Math.max(Number(process.exitCode ?? 0), code)
