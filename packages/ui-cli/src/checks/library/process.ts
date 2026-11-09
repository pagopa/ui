import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import net from "node:net"
import path from "node:path"

export const nodeExecutable = process.execPath

export function buildNext(nextCli: string, cwd: string, env: NodeJS.ProcessEnv): void {
  const next = spawnSync(nodeExecutable, [nextCli, "build"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    env: { ...env, NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" },
  })
  if (next.error) throw next.error
  if (next.status !== 0) {
    const lines = `${next.stdout}${next.stderr}`.trim().split("\n")
    assert.fail(`next build failed:\n${lines.slice(-40).join("\n")}`)
  }
}

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      server.close((error) => {
        if (error) reject(error)
        else if (address && typeof address === "object") resolve(address.port)
        else reject(new Error("Could not reserve a port for the Next server"))
      })
    })
  })
}

export async function startNextServer(
  directory: string,
  env: NodeJS.ProcessEnv,
): Promise<{ url: string; output: () => string; close: () => Promise<void> }> {
  const next = createRequire(path.join(directory, "package.json")).resolve("next/dist/bin/next")
  const port = await freePort()
  const child = spawn(
    nodeExecutable,
    [next, "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: directory,
      env: { ...env, NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  )
  const url = `http://127.0.0.1:${port}`
  let output = ""
  let spawnError: Error | undefined
  child.on("error", (error) => {
    spawnError = error
  })
  const record = (chunk: Buffer) => {
    output = `${output}${chunk.toString()}`.slice(-20_000)
  }
  child.stdout.on("data", record)
  child.stderr.on("data", record)

  const close = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return
    const stopped = new Promise<void>((resolve) => child.once("close", () => resolve()))
    if (!child.kill("SIGTERM")) return
    const deadline = setTimeout(() => child.kill("SIGKILL"), 5_000)
    try {
      await stopped
    } finally {
      clearTimeout(deadline)
    }
  }

  try {
    const deadline = Date.now() + 30_000
    let responseStatus = ""
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`Next server exited (${child.exitCode ?? child.signalCode})`)
      }
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1_000) })
        await response.arrayBuffer()
        if (response.ok) return { url, output: () => output, close }
        responseStatus = `; last HTTP status ${response.status}`
      } catch {
        // The server can accept the socket before the first response is ready.
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(`Next server did not become ready${responseStatus}`)
  } catch (error) {
    await close()
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Next production server failed: ${reason}\n${output}`, { cause: error })
  }
}

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env,
  })
  if (result.error) throw result.error
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`,
  )
  return result.stdout
}

export async function runStreamingCommand(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" })
    child.on("error", reject)
    child.on("close", (code, signal) => {
      if (code === 0) resolve()
      else {
        const reason = signal ? `signal ${signal}` : `exit code ${code}`
        reject(new Error(`${command} ${args.join(" ")} failed with ${reason}`))
      }
    })
  })
}
