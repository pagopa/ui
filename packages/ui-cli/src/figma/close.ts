export type CloseStep = {
  step: string
  result: "pass" | "fail" | "drift" | "not run" | "skipped"
  exitCode: number | null
  details?: string[]
}
export type CloseInput = { nodes: string[]; source: string; files: string[]; skipChain: boolean }
export type CloseDeps = {
  run: (step: string) => Promise<number | { code: number; details: string[] }>
  storybook: () => Promise<boolean>
}

export async function closeWorkflow(input: CloseInput, deps: CloseDeps) {
  const steps: CloseStep[] = []
  const run = async (step: string) => {
    try {
      const result = await deps.run(step)
      const code = typeof result === "number" ? result : result.code
      steps.push({
        step,
        result:
          code === 0
            ? "pass"
            : code === 3
              ? "drift"
              : code === 2 && step !== "pnpm nx run workspace:verify"
                ? "not run"
                : "fail",
        exitCode: code,
        ...(typeof result === "number" ? {} : { details: result.details }),
      })
    } catch (error) {
      steps.push({
        step,
        result: "fail",
        exitCode: 1,
        details: [error instanceof Error ? error.message : String(error)],
      })
    }
  }
  for (const step of ["check catalogue", "check rules", "check devices", "check evidence"])
    await run(step)
  let available = false
  try {
    available = await deps.storybook()
  } catch {
    /* unavailable */
  }
  for (const node of input.nodes) {
    const step = `parity check --node ${node} --saved`
    if (available) await run(step)
    else steps.push({ step, result: "not run", exitCode: null })
  }
  await run("check docs")
  if (input.skipChain)
    steps.push({ step: "pnpm nx run workspace:verify", result: "skipped", exitCode: null })
  else await run("pnpm nx run workspace:verify")
  const exitCode = steps.some((s) => s.result === "fail")
    ? 1
    : steps.some((s) => s.result === "drift")
      ? 3
      : steps.some((s) => s.result === "not run")
        ? 2
        : 0
  return { ...input, steps, exitCode }
}
