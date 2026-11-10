import type { Workspace } from "../adapters/workspace.ts"
import { committedFile, readCases, readRegistry } from "../records/committed.ts"
import { saveCase, syncProposals } from "./cases.ts"

import { corpusPath, devicePolicy, inventoryNodes } from "./context.ts"
import { output, type ParityOutput } from "./output.ts"
export function cases(
  workspace: Workspace,
  options: { casesFile?: string; nodeId?: string; dryRun?: boolean } = {},
): ParityOutput {
  const out: string[] = []
  const err: string[] = []
  const path_ = corpusPath(workspace, options.casesFile)
  const corpus = readCases(path_) ?? []
  const nodeId = options.nodeId
  const result = syncProposals({
    cases: corpus,
    nodeId,
    nodes: inventoryNodes(workspace),
    registry: readRegistry(committedFile("registry", workspace.root)),
    policy: devicePolicy(workspace),
  })
  const dryRun = options.dryRun
  for (const proposal of result.proposals) {
    if (dryRun) {
      out.push(
        `propose ${proposal.nodeId} ${String(proposal.device).padEnd(8)} ` +
          `state=${JSON.stringify(proposal.state)} width=${proposal.width ?? "-"} ` +
          `-> ${proposal.storyId}`,
      )
      continue
    }
    const saved = saveCase(path_, proposal)
    out.push(`case saved: ${saved.entry.id} -> ${saved.file}${saved.replaced ? " (replaced)" : ""}`)
  }
  for (const proposal of result.stateProposals) {
    if (dryRun) {
      out.push(
        `propose ${proposal.nodeId} property state=${JSON.stringify(proposal.state)} ` +
          `variant=${proposal.variant} width=${proposal.width ?? "-"} -> ${proposal.storyId}`,
      )
      continue
    }
    const saved = saveCase(path_, proposal)
    out.push(`case saved: ${saved.entry.id} -> ${saved.file}${saved.replaced ? " (replaced)" : ""}`)
  }
  for (const skip of result.skipped) {
    out.push(`skip    ${skip.nodeId} ${(skip.missing ?? []).join(",")} — ${skip.reason}`)
  }
  for (const skip of result.stateSkipped) {
    out.push(`skip    ${skip.nodeId} ${skip.variant ?? "state"} — ${skip.reason}`)
  }
  out.push(
    `${result.proposals.length} device + ${result.stateProposals.length} state/property ` +
      `${dryRun ? "proposal(s)" : "case(s) written"} · ` +
      `${result.skipped.length + result.stateSkipped.length} skip(s) · ` +
      `${result.coverage.totals.missing} device case(s) missing before this run`,
  )
  return output(0, out, err)
}
