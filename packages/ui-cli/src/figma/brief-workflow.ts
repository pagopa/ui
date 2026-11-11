import type { Workspace } from "../adapters/workspace.ts"
import { readInventory } from "../records/committed.ts"
import { readComments, refreshComments } from "./comments.ts"
import { readRulesSnapshot } from "./rules.ts"
import { refreshRules } from "./rules-workflow.ts"

export async function refreshBriefSnapshots(
  pinned: string | undefined,
  rules: string | undefined,
  comments: string | undefined,
  operations: { rules: () => Promise<unknown>; comments: () => Promise<unknown> },
): Promise<void> {
  if (pinned && pinned === rules && pinned === comments) return
  await operations.rules()
  await operations.comments()
}

export async function refreshBrief(workspace: Workspace, token: () => string): Promise<void> {
  const inventory = readInventory(workspace.root)
  const rules = readRulesSnapshot(workspace.root, false)
  const comments = readComments(workspace)
  await refreshBriefSnapshots(inventory.fileVersion, rules?.version, comments?.version, {
    rules: () => refreshRules(workspace, token(), {}),
    comments: () => refreshComments(workspace, token()),
  })
}
