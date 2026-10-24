// Starts Storybook on :6006 (or $PORT) and forwards the extra arguments Nx
// appends to the Storybook CLI.
import { spawn } from "node:child_process"

const port = process.env.PORT ?? "6006"
const command = process.platform === "win32" ? "storybook.cmd" : "storybook"
const child = spawn(command, ["dev", "-p", port, ...process.argv.slice(2)], {
  stdio: "inherit",
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal))
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
