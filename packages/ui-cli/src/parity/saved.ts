import type { Workspace } from "../adapters/workspace.ts"
import { requiredDevices } from "../figma/devices.ts"
import { UsageError } from "../lib/command.ts"
import { loadCaseFile } from "./cases.ts"
import { corpusPath, devicePolicy, inventoryNode } from "./context.ts"
import { output, type ParityOutput } from "./output.ts"
import type { CheckOptions } from "./types.ts"

export async function checkSaved(
  workspace: Workspace,
  options: CheckOptions,
  run: (options: CheckOptions) => Promise<ParityOutput>,
): Promise<ParityOutput> {
  if (!options.nodeId || options.caseId)
    throw new UsageError("--saved needs one --node <id>, not --case")
  const entries = loadCaseFile(corpusPath(workspace, options.casesFile)).filter(
    (entry) =>
      entry.nodeId === options.nodeId && (!options.device || entry.device === options.device),
  )
  if (!entries.length) throw new UsageError(`${options.nodeId}: no saved cases`)
  const node = inventoryNode(workspace, options.nodeId)
  if (!node) throw new UsageError(`${options.nodeId} is not in inventory.json`)
  const declared = requiredDevices(devicePolicy(workspace), node)
  if (options.device && !declared.includes(options.device))
    throw new UsageError(`${options.nodeId} does not declare device ${options.device}`)
  const missingDevices = declared
    .filter((device) => !options.device || device === options.device)
    .filter((device) => !entries.some((entry) => entry.device === device))
  const results: ParityOutput[] = []
  for (const entry of entries) {
    try {
      results.push(
        await run({
          ...options,
          nodeId: undefined,
          caseId: entry.id,
          saved: false,
          devices: false,
        }),
      )
    } catch (error) {
      results.push(
        output(
          error instanceof UsageError ? 2 : 1,
          [],
          [`error: ${error instanceof Error ? error.message : String(error)}`],
          { id: entry.id, error: error instanceof Error ? error.message : String(error) },
        ),
      )
    }
  }
  const data = {
    nodeId: options.nodeId,
    cases: results.map((result) => result.data),
    missingDevices,
  }
  const err = [
    ...results.flatMap((result) => result.err),
    ...missingDevices.map(
      (device) => `error: ${options.nodeId}: no saved case for declared device ${device}`,
    ),
  ]
  const code =
    missingDevices.length || results.some((result) => result.code === 2)
      ? 2
      : results.some((result) => result.code !== 0 && result.code !== 3)
        ? 1
        : results.some((result) => result.code === 3)
          ? 3
          : 0
  return output(
    code,
    options.json ? [JSON.stringify(data, null, 2)] : results.flatMap((result) => result.out),
    err,
    data,
  )
}
