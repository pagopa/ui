import { execFileSync } from "node:child_process"

export type ExternalCommand = (args: string[], cwd: string) => string

export const runGit: ExternalCommand = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

export const runGh: ExternalCommand = (args, cwd) =>
  execFileSync("gh", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

export const runPnpm: ExternalCommand = (args, cwd) =>
  execFileSync("pnpm", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

export async function fetchHandoffArtifact(url: string): Promise<string> {
  const parsed = new URL(url)
  if (parsed.protocol !== "https:") throw new Error("handoff delta artifact must use HTTPS")
  const response = await fetch(parsed, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`handoff delta artifact: HTTP ${response.status}`)
  return response.text()
}
