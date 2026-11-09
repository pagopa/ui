import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import { z } from "zod"

export type RunnerResult = { status: number | null; stdout: string; stderr: string; error?: Error }
export type TestingAdapters = {
  git(root: string, args: string[]): RunnerResult
  vitest(root: string, args: string[]): RunnerResult
  now(): Date
}

function vitestBinary(root: string, env: NodeJS.ProcessEnv): string {
  if (env.PAGOPA_UI_VITEST_BIN) return env.PAGOPA_UI_VITEST_BIN
  const require = createRequire(path.join(root, "package.json"))
  const manifest = z
    .looseObject({ bin: z.looseObject({ vitest: z.string().optional() }).optional() })
    .parse(require("vitest/package.json"))
  if (!manifest.bin?.vitest) throw new Error("vitest does not expose a CLI binary")
  return path.join(path.dirname(require.resolve("vitest/package.json")), manifest.bin.vitest)
}
export function testingAdapters(env: NodeJS.ProcessEnv): TestingAdapters {
  return {
    git: (root, args) => spawnSync("git", args, { cwd: root, encoding: "utf8", env }),
    vitest: (root, args) =>
      spawnSync(process.execPath, [vitestBinary(root, env), ...args], {
        cwd: root,
        encoding: "utf8",
        env,
      }),
    now: () => new Date(),
  }
}
