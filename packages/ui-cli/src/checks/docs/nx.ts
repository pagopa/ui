import { execFileSync } from "node:child_process"
import path from "node:path"

export function readNx(workspace: string, env: NodeJS.ProcessEnv, args: string[]): string {
  return execFileSync(path.join(workspace, "node_modules/.bin/nx"), args, {
    cwd: workspace,
    encoding: "utf8",
    timeout: 20_000,
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...env, NX_DAEMON: "false", NX_TUI: "false", FORCE_COLOR: "0" },
  })
}
