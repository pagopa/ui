import { execFileSync } from "node:child_process"

const MISSING_MESSAGE = [
  "FIGMA_TOKEN is missing or empty from the process environment and macOS keychain.",
  "The live Figma tools need a read-only token with the file_content:read and library_content:read scopes.",
  "Export the token in the environment that runs this command or store it in the macOS keychain as figma-pat, then re-run it.",
  "The tools never read .env automatically.",
].join("\n")

const WHITESPACE_MESSAGE = "FIGMA_TOKEN contains whitespace; use the token value exactly as issued."

export type FigmaTokenSource = "environment" | "keychain"
export interface FigmaToken {
  token: string
  source: FigmaTokenSource
}
export type KeychainRunner = (command: string, args: string[]) => string

function keychainToken(): string {
  if (process.platform !== "darwin") return ""
  try {
    return execFileSync("security", ["find-generic-password", "-s", "figma-pat", "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    return ""
  }
}

function validate(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.trim() === "") return undefined
  const token = raw.trim()
  if (/\s/.test(token)) throw new Error(WHITESPACE_MESSAGE)
  return token
}

export function resolveFigmaToken(
  env: NodeJS.ProcessEnv = process.env,
  run: KeychainRunner = keychainToken,
): FigmaToken {
  const fromEnvironment = validate(env.FIGMA_TOKEN)
  if (fromEnvironment) return { token: fromEnvironment, source: "environment" }

  let fromKeychain: string | undefined
  try {
    fromKeychain = validate(run("security", ["find-generic-password", "-s", "figma-pat", "-w"]))
  } catch (error) {
    if (error instanceof Error && error.message === WHITESPACE_MESSAGE) throw error
  }
  if (fromKeychain) return { token: fromKeychain, source: "keychain" }
  throw new Error(MISSING_MESSAGE)
}

export function figmaToken(env: NodeJS.ProcessEnv = process.env, run?: KeychainRunner): string {
  return resolveFigmaToken(env, run).token
}

export function requireFigmaToken(
  env: NodeJS.ProcessEnv = process.env,
  run?: KeychainRunner,
): string {
  return figmaToken(env, run)
}
