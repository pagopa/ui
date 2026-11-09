import type { Workspace } from "../adapters/workspace.ts"
import { UsageError } from "../lib/command.ts"
import type { ParityCase } from "../schemas/parity.ts"
import { inventoryNode } from "./context.ts"
import { evaluateCase } from "./evaluate.ts"
import { checkCaseEvidence } from "./evidence.ts"
import { specFromCase } from "./mapping.ts"
import type { CaptureOptions } from "./render.ts"
import { loadExport } from "./source.ts"

export function alignEvaluator(
  workspace: Workspace,
  capture: (options: CaptureOptions) => Promise<Record<string, unknown>>,
) {
  return async (entry: ParityCase) => {
    const project = loadExport(workspace)
    const spec = specFromCase(entry)
    if (project.raw.kind === "parity-source") {
      const errors = checkCaseEvidence({
        root: workspace.workspaceRoot,
        entry: spec,
        node: inventoryNode(workspace, entry.nodeId),
        sourceSha256: project.sourceSha256,
      })
      if (errors.length) throw new UsageError(errors[0])
    }
    const { report } = await evaluateCase(workspace, spec, { project, capture })
    return { verdict: report.verdict, deltas: report.deltas }
  }
}
