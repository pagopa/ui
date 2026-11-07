// What every command adapter receives: the process seen as data. The bin builds
// it from `process`; the contract tests build it from a fixture, so a command
// runs in-process with its output captured and its environment injected.
import type { CommandDef } from "citty"

import { createWorkspace, type Workspace } from "../adapters/workspace.ts"
import { exitCodeOf } from "../lib/command.ts"

// The public exit-code contract, consumed by the CI jobs and the agents.
export const EXIT = {
  ok: 0,
  failure: 1,
  usage: 2,
  /** The result needs reconciliation: Figma drift, a parity delta. */
  drift: 3,
} as const

export interface Io {
  out(line: string): void
  err(line: string): void
}

export interface CliContext {
  readonly env: NodeJS.ProcessEnv
  readonly cwd: string
  readonly io: Io
  workspace(): Workspace
  /** Set by the command that ran; read by the bin. */
  exitCode: number
}

export function createContext(input: { env: NodeJS.ProcessEnv; cwd: string; io: Io }): CliContext {
  let workspace: Workspace | undefined
  return {
    ...input,
    exitCode: EXIT.ok,
    workspace() {
      workspace ??= createWorkspace({ env: input.env, cwd: input.cwd })
      return workspace
    },
  }
}

export const processIo: Io = {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
}

// The one place that turns a command's result or error into the exit code, so
// no command calls `process.exit` and no domain module prints an error.
export function action<T>(
  ctx: CliContext,
  run: (input: T) => number | Promise<number>,
): (context: { args: T }) => Promise<void> {
  return async ({ args }) => {
    try {
      ctx.exitCode = await run(args)
    } catch (error) {
      ctx.io.err(`error: ${error instanceof Error ? error.message : String(error)}`)
      if (ctx.env.DEBUG && error instanceof Error && error.stack) ctx.io.err(error.stack)
      ctx.exitCode = exitCodeOf(error)
    }
  }
}

export function printLines(io: Io, lines: { out?: string[]; err?: string[] }): void {
  for (const line of lines.out ?? []) io.out(line)
  for (const line of lines.err ?? []) io.err(line)
}

export function printJson(io: Io, value: unknown): void {
  io.out(JSON.stringify(value, null, 2))
}

export type Command = CommandDef
