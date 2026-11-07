// Resolves `ui-cli` argument tokens against the command tree without running
// anything: the docs gate uses it so a guide or a skill cannot name a
// subcommand or a flag the CLI does not have.
import type { ArgsDef, CommandDef } from "citty"

// A lazy (function or promise) node cannot be read statically: it passes.
type Resolvable<T> = T | Promise<T> | (() => T) | (() => Promise<T>)
function readable<T extends object>(value: Resolvable<T> | undefined): T | undefined {
  if (value === undefined || typeof value === "function" || value instanceof Promise)
    return undefined
  return value
}

// `--no-x` negates a boolean `x` only.
function declaredFlag(args: ArgsDef, token: string): ArgsDef[string] | undefined {
  const name = token.replace(/^--?/, "").split("=")[0]
  const find = (wanted: string) =>
    Object.entries(args).find(
      ([key, arg]) => key === wanted || ("alias" in arg && [arg.alias].flat().includes(wanted)),
    )?.[1]
  const direct = find(name)
  if (direct || !name.startsWith("no-")) return direct
  const negated = find(name.slice(3))
  return negated?.type === "boolean" ? negated : undefined
}

export function unresolvedCliTokens(root: CommandDef, tokens: readonly string[]): string | null {
  let command = root
  const path: string[] = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const args: ArgsDef = readable(command.args) ?? {}
    if (token === "--help" || token === "-h") return null
    if (token.startsWith("-")) {
      const declared = declaredFlag(args, token)
      if (!declared) return `unknown ui-cli flag ${token} for "${["ui-cli", ...path].join(" ")}"`
      if (declared.type === "string" && !token.includes("=")) index += 1
      continue
    }
    const subCommands = readable(command.subCommands)
    if (subCommands) {
      const next = subCommands[token]
      if (next === undefined)
        return `unknown ui-cli command "${["ui-cli", ...path, token].join(" ")}"`
      const resolved = readable<CommandDef>(next)
      if (!resolved) return null
      command = resolved
      path.push(token)
      continue
    }
    if (!Object.values(args).some((arg) => arg.type === "positional"))
      return `unexpected argument ${token} for "${["ui-cli", ...path].join(" ")}"`
  }
  return null
}
