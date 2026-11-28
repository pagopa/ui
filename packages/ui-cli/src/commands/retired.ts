import { defineCommand } from "citty"

import { action, EXIT, type CliContext } from "./context.ts"

/**
 * A command the tool no longer offers, kept so the old spelling fails with the
 * one that replaced it instead of a bare "unknown command". The pointer is
 * printed on stderr and the exit code is the usage one: the invocation is what
 * was wrong, nothing ran.
 *
 * The pointer is a `pnpm ui-cli …` command the sources print, so `check docs`
 * resolves it like any other: a retirement that named a second retired command
 * would be caught by the same gate.
 */
export function retiredCommand(ctx: CliContext, name: string, replacement: string) {
  return defineCommand({
    meta: { name, description: `Retired: use ${replacement}` },
    run: action(ctx, () => {
      ctx.io.err(`pnpm ui-cli ${name} is retired: run ${replacement}`)
      return EXIT.usage
    }),
  })
}
