// `ui-cli build <step>`: the steps the package build runs after the compiler.
import { defineCommand, type CommandDef } from "citty"

import { prepareTypes } from "../build/prepare-types.ts"
import { action, EXIT, type CliContext } from "./context.ts"

export function buildCommands(ctx: CliContext): CommandDef {
  return defineCommand({
    meta: { name: "build", description: "Package build steps" },
    subCommands: {
      "prepare-types": defineCommand({
        meta: {
          name: "prepare-types",
          description: "Make the emitted declarations alias-free ESM",
        },
        run: action(ctx, () => {
          ctx.io.out(prepareTypes(ctx.workspace()))
          return EXIT.ok
        }),
      }),
    },
  })
}
