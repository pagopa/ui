// Figma parity — the rows the queue works through.
//
// Joins the reviewed registry (`registry.json`) with the story files it points
// at: one row per registry target, which is what the queue prints and what
// `check` derives a case spec from. Story ids come from the Storybook slug of
// the story title plus the export name, the same identity the iframe URL needs
// (`components-inputs-textfield--playground`).
//
// These rows are not the corpus: the corpus holds the reviewed cases and reads
// the documents it was built from (`corpus.ts`), while a row exists for every
// registry target — including the ones that owe no case yet.

import fs from "node:fs"

import type { Workspace } from "../adapters/workspace.ts"
import { createSourceModules } from "../lib/source-modules.ts"
import { readRegistry } from "../records/committed.ts"
import type { Registry } from "../schemas/catalogue.ts"
import { storyId } from "./corpus.ts"

// One case per registry target: the identity, the declared story exports and
// the Design-panel nodes each export shows. A target without a story (the
// mocked templates before their wave, a node whose evidence is still missing)
// is listed with an empty story set: that absence is the signal.
export type CaseRow = {
  nodeId: string
  status: string
  module: string
  export: string
  additionalTargets: Array<{ module: string; export: string }>
  story: string | null
  title: string | null
  exports: string[]
  storyIds: string[]
  design: Record<string, string[] | undefined>
}

export type CaseList = CaseRow[] & { missing: Array<{ nodeId: string; story: string }> }

export function buildCases(
  workspace: Workspace,
  {
    registry = readRegistry(workspace.root),
    statuses = ["pending", "implemented"],
  }: { registry?: Registry; statuses?: string[] } = {},
): CaseList {
  const { storyTitle, storyDesignNodes } = createSourceModules(workspace)
  const wanted = new Set(statuses)
  const titles = new Map<string, string | undefined>()
  const designs = new Map<string, ReturnType<typeof storyDesignNodes>>()
  const cases: CaseRow[] = []
  const missing: Array<{ nodeId: string; story: string }> = []
  for (const [nodeId, entry] of Object.entries(registry.entries ?? {})) {
    const target = entry.target
    if (!target || !wanted.has(entry.status)) continue
    if (!target.story) {
      cases.push({
        nodeId,
        status: entry.status,
        module: target.module,
        export: target.export,
        additionalTargets: target.additionalTargets ?? [],
        story: null,
        title: null,
        exports: [],
        storyIds: [],
        design: {},
      })
      continue
    }
    const file = target.story
    if (!fs.existsSync(workspace.path(file))) {
      // A registry pointer to a deleted story is a dangling reference, not a
      // silent skip: the queue reports it.
      missing.push({ nodeId, story: file })
      continue
    }
    if (!titles.has(file)) titles.set(file, storyTitle(file))
    if (!designs.has(file)) designs.set(file, storyDesignNodes(file))
    const title = titles.get(file)
    if (!title) continue
    const exports = target.storyExports ?? []
    cases.push({
      nodeId,
      status: entry.status,
      module: target.module,
      export: target.export,
      additionalTargets: target.additionalTargets ?? [],
      story: file,
      title,
      exports,
      storyIds: exports.map((name) => storyId(title, name)),
      design: Object.fromEntries(
        exports.map((name) => [
          name,
          [...(designs.get(file)?.stories.get(name) ?? designs.get(file)?.meta ?? new Set())],
        ]),
      ),
    })
  }
  cases.sort((a, b) => a.nodeId.localeCompare(b.nodeId, undefined, { numeric: true }))
  return Object.assign(cases, { missing })
}
