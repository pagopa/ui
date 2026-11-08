// The command tree. Every group is a factory over the run's context, because
// citty hands `data` to the top command only: the closure is how a subcommand
// reaches the environment, the workspace and the output.
import { defineCommand, renderUsage, runCommand, type CommandDef } from "citty"

import { buildCommands } from "./build.ts"
import { checkCommands } from "./check.ts"
import { EXIT, type CliContext } from "./context.ts"
import {
  artworkCheckCommands,
  artworkUpdateCommands,
  catalogueCheckCommands,
  figmaCommands,
} from "./figma.ts"
import { rulesCheckCommand } from "./figma-rules.ts"
import { parityCommands } from "./parity.ts"
import { testCommands } from "./test.ts"
import { updateCommands } from "./update.ts"

export function createCli(ctx: CliContext): CommandDef {
  const root: CommandDef = defineCommand({
    meta: {
      name: "ui-cli",
      version: "0.0.0",
      description: "The UI CLI, checks and Figma tooling of the PagoPA design system",
    },
    subCommands: {
      check: checkCommands(ctx, () => root, {
        rules: rulesCheckCommand(ctx),
        ...artworkCheckCommands(ctx),
        ...catalogueCheckCommands(ctx),
      }),
      update: updateCommands(ctx, artworkUpdateCommands(ctx)),
      build: buildCommands(ctx),
      figma: figmaCommands(ctx, () => root),
      parity: parityCommands(ctx),
      test: testCommands(ctx),
    },
  })
  return root
}

const HELP = new Set(["--help", "-h"])

async function subCommandsOf(command: CommandDef): Promise<Record<string, CommandDef>> {
  const value =
    typeof command.subCommands === "function"
      ? await command.subCommands()
      : await command.subCommands
  const entries = await Promise.all(
    Object.entries(value ?? {}).map(
      async ([name, sub]) => [name, typeof sub === "function" ? await sub() : await sub] as const,
    ),
  )
  return Object.fromEntries(entries)
}

// The command the arguments name, and its parent, for the usage text.
async function resolve(
  root: CommandDef,
  argv: readonly string[],
): Promise<[CommandDef, CommandDef | undefined]> {
  let command = root
  let parent: CommandDef | undefined
  for (const token of argv) {
    if (token.startsWith("-")) continue
    const next = (await subCommandsOf(command))[token]
    if (!next) break
    parent = command
    command = next
  }
  return [command, parent]
}

function isCliError(error: unknown): error is Error {
  return error instanceof Error && error.name === "CLIError"
}

// Runs the tree in-process and returns the exit code; `--help` prints the
// usage of the named command. A citty argument error is a usage error (2).
export async function execute(
  root: CommandDef,
  ctx: CliContext,
  argv: readonly string[],
): Promise<number> {
  if (argv.some((token) => HELP.has(token))) {
    ctx.io.out(await renderUsage(...(await resolve(root, argv))))
    return EXIT.ok
  }
  try {
    await runCommand(root, { rawArgs: [...argv] })
    return ctx.exitCode
  } catch (error) {
    if (!isCliError(error)) throw error
    ctx.io.err(await renderUsage(...(await resolve(root, argv))))
    ctx.io.err(error.message)
    return EXIT.usage
  }
}
