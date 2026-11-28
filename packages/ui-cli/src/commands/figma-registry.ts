import { defineCommand } from "citty"

import { retiredCommand } from "./retired.ts"
import type { CliContext } from "./context.ts"

// `set` wrote the registry alone, which left the map and the catalogue to the
// caller: `record` is the same write plus the documents the decision entails,
// atomically. The subcommand stays as a pointer so an old invocation lands on
// it rather than on the parent usage text.
export function registryCommand(ctx: CliContext) {
  const set = retiredCommand(
    ctx,
    "figma registry set",
    "pnpm ui-cli record <nodeId> --status <status>",
  )
  return defineCommand({ meta: { name: "registry" }, subCommands: { set } })
}
