// Figma alignment — one node, one invocation.
//
// Opening a node used to be a queue of reads: the inventory, the registry
// target, the device plan, the Storybook probe, and only then the diagnostic.
// Each answer was printed for the next command to consume, so a session paid a
// turn per step and could stop between any two of them with nothing to resume.
// This module runs the whole preflight and the diagnostic in one call: it reads
// the committed records, prints the plan and the comparison, and writes nothing
// (ADR-0015), so a second run on the same tree says the same thing.
import type { Workspace } from "../adapters/workspace.ts"
import { storybookAnswers } from "../adapters/storybook.ts"
import { UsageError } from "../lib/command.ts"
import { check } from "../parity/check.ts"
import { devicePolicy, inventoryNode, registryCase } from "../parity/context.ts"
import type { ParityOutput } from "../parity/output.ts"
import { specFromOptions } from "../parity/spec.ts"
import type { DiagnoseOptions } from "../parity/types.ts"
import { requiredDevices } from "./devices.ts"

export type AlignPlan = {
  nodeId: string
  name: string
  page: string
  status: string
  storyId: string
  export: string
  /** The devices the set declares, in policy order; empty when it declares none. */
  devices: string[]
}

/** Everything `align` needs beyond the command line: the network and the probe. */
export type AlignDeps = {
  /** The Storybook the diagnostic captures from, probed before the capture. */
  storybookUrl?: string
  storybook?: (url: string) => Promise<boolean>
  diagnose?: typeof check
}

export type AlignResult = {
  plan: AlignPlan
  /** The Storybook the probe answered, when asked; absent when not asked. */
  storybook?: { url: string }
  diagnostic: ParityOutput
  out: string[]
  err: string[]
  code: number
}

// The preflight: every read that can fail is a usage error naming what to fix,
// and it fails before the capture, so a missing story costs a message and not a
// browser session. The node itself comes first: a node the inventory does not
// hold has no page, no variants and no story, so nothing downstream can help.
export function planAlignment(workspace: Workspace, options: DiagnoseOptions): AlignPlan {
  const nodeId = options.nodeId
  if (!nodeId) throw new UsageError("align requires --node <id>")
  const node = inventoryNode(workspace, nodeId)
  if (!node)
    throw new UsageError(
      `${nodeId} is not in the inventory — refresh it with "pnpm ui-cli update inventory"`,
    )
  const known = registryCase(workspace, nodeId)
  // `specFromOptions` owns which story and export a case captures; running it
  // here is what turns its usage errors into preflight failures.
  const spec = specFromOptions(known, options)
  const policy = devicePolicy(workspace)
  const devices = requiredDevices(policy, node)
  return {
    nodeId,
    name: node.name,
    page: node.pageName,
    status: known.status,
    storyId: spec.storyId,
    export: spec.export,
    devices,
  }
}

export function formatAlign(plan: AlignPlan, storybook?: { url: string }): string[] {
  const out = [
    `${plan.nodeId} "${plan.name}" · ${plan.page} · ${plan.status}`,
    `story ${plan.storyId} · ${plan.export}`,
    plan.devices.length
      ? `devices ${plan.devices.join(", ")} (${plan.devices.length} declared)`
      : "devices none declared",
  ]
  if (storybook) out.push(`storybook ${storybook.url} answers`)
  return out
}

export async function align(
  workspace: Workspace,
  options: DiagnoseOptions,
  deps: AlignDeps = {},
): Promise<AlignResult> {
  const plan = planAlignment(workspace, options)
  let storybook: AlignResult["storybook"]
  if (deps.storybookUrl) {
    const answers = await (deps.storybook ?? storybookAnswers)(deps.storybookUrl)
    if (!answers)
      throw new UsageError(
        `${plan.storyId}: ${deps.storybookUrl} does not answer — start Storybook, then rerun align`,
      )
    storybook = { url: deps.storybookUrl }
  }
  const diagnostic = await (deps.diagnose ?? check)(workspace, { ...options, nodeId: plan.nodeId })
  return {
    plan,
    ...(storybook ? { storybook } : {}),
    diagnostic,
    out: [...formatAlign(plan, storybook), ...diagnostic.out],
    err: diagnostic.err,
    code: diagnostic.code,
  }
}
