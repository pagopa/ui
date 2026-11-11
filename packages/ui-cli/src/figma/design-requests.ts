import fs from "node:fs"
import path from "node:path"
import { z } from "zod"
import type { Workspace } from "../adapters/workspace.ts"
import { runGh } from "../adapters/handoff.ts"
import { writeJson, writeText } from "../lib/json.ts"
import { UsageError } from "../lib/command.ts"
import { NOTE_LENGTH_LIMIT, type Registry } from "../schemas/catalogue.ts"
import {
  committedFile,
  forgetCommitted,
  readInventory,
  readRegistry,
} from "../records/committed.ts"
import {
  answeredRecordSource,
  openRecord,
  readDesignRequestRecord,
} from "./design-request-record.ts"
import { designPaths, readFigmaConfig } from "./config.ts"
import { markRule } from "./rules-workflow.ts"

const OptionSchema = z.strictObject({
  key: z.enum(["a", "b", "c"]),
  label: z.string().trim().min(1),
  impact: z.string().optional(),
  captures: z
    .array(
      z.strictObject({ width: z.union([z.literal(320), z.literal(1200)]), url: z.string().url() }),
    )
    .default([]),
})

const InputSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  type: z.enum(["design", "dev"]),
  question: z.string().trim().min(1),
  context: z.string().trim().min(1),
  options: z.array(OptionSchema).default([]),
  recommendation: z.string().trim().min(1),
  ask: z.string().trim().min(1),
  when: z.string().trim().min(1),
  visual: z.boolean().default(false),
  technicalContext: z.string().default(""),
  nodeId: z.string().optional(),
  rulesCard: z.string().optional(),
})

export type DesignRequestInput = z.infer<typeof InputSchema>
export type IssueCommand = (args: string[], cwd: string) => string

function parseInput(source: string): DesignRequestInput {
  const parsed = InputSchema.safeParse(JSON.parse(source))
  if (!parsed.success) throw new UsageError(`invalid design request input: ${parsed.error.message}`)
  return parsed.data
}

function previewStoryUrl(preview: string, slug: string, key: string): string {
  return `${preview.replace(/\/$/, "")}/?path=/story/reviews-${slug}--option-${key}`
}

function validateVisualRequest(
  input: DesignRequestInput,
  preview: string,
  previewBranch: string,
): void {
  if (!input.visual) return
  if (input.type !== "design" || input.options.length < 2) {
    throw new UsageError("a visual design request needs at least two options")
  }
  const keys = new Set(input.options.map((option) => option.key))
  if (keys.size !== input.options.length) {
    throw new UsageError("visual request option keys must be unique")
  }
  const widths = input.options.map((option) =>
    option.captures
      .map((capture) => capture.width)
      .sort()
      .join(","),
  )
  if (new Set(widths).size !== 1 || input.options.some((option) => !option.captures.length)) {
    throw new UsageError("every visual option needs captures at the same width(s)")
  }
  if (preview === "none" || !previewBranch) {
    throw new UsageError("visual requests need design.preview.url and design.preview.branch")
  }
  const wrongBranch = input.options.some((option) =>
    option.captures.some((capture) => {
      if (!capture.url.startsWith("https://raw.githubusercontent.com/")) return true
      const branchPath = new URL(capture.url).pathname.match(/^\/[^/]+\/[^/]+\/(.+)$/)?.[1]
      return !branchPath?.startsWith(`${previewBranch}/`)
    }),
  )
  if (wrongBranch) {
    throw new UsageError("visual captures must use the raw GitHub URL of design.preview.branch")
  }
}

function optionBody(input: DesignRequestInput, preview: string): string {
  return input.options
    .map((option) => {
      const detail = option.impact ? ` — ${option.impact}` : ""
      if (input.type === "dev" || !input.visual) {
        return `**${option.key.toUpperCase()} — ${option.label}**${detail}`
      }
      const story = previewStoryUrl(preview, input.slug, option.key)
      const lines = [
        `**${option.key.toUpperCase()} — ${option.label}** [See it in the preview](${story})`,
      ]
      for (const capture of option.captures) {
        lines.push(`![${option.label} at ${capture.width}px](${capture.url})`)
      }
      return `${lines.join("\n")}\n${detail}`.trim()
    })
    .join("\n\n")
}

function designIssueBody(input: DesignRequestInput, options: string): string {
  return [
    "## What we are deciding",
    input.question,
    "",
    "## Why it matters for the people who use the product",
    input.context,
    "",
    "## The options",
    options,
    "",
    "## What we recommend",
    input.recommendation,
    "",
    "## What we need from you",
    input.ask,
    "",
    "## When",
    input.when,
    ...(input.technicalContext
      ? [
          "",
          "<details><summary>Technical context for the team</summary>",
          "",
          input.technicalContext,
          "",
          "</details>",
        ]
      : []),
  ].join("\n")
}

function developerIssueBody(input: DesignRequestInput, options: string): string {
  return [
    "## Decision",
    input.question,
    "",
    "## Context",
    input.context,
    "",
    "## Options",
    options,
    "",
    "## Recommendation",
    input.recommendation,
    "",
    "## What we need from you",
    input.ask,
    "",
    "## When",
    input.when,
  ].join("\n")
}

function issueBody(input: DesignRequestInput, preview: string, previewBranch: string): string {
  validateVisualRequest(input, preview, previewBranch)
  const options = optionBody(input, preview)
  return input.type === "design"
    ? designIssueBody(input, options)
    : developerIssueBody(input, options)
}

function recordContent(
  input: DesignRequestInput,
  issueUrl: string,
  owners: string[],
  preview: string,
): string {
  const options = input.options.length
    ? input.options
        .map(
          (option) =>
            `- ${option.key.toUpperCase()} — ${option.label}${option.impact ? `: ${option.impact}` : ""}`,
        )
        .join("\n")
    : ""
  return openRecord({
    title: input.title,
    type: input.type,
    issueUrl,
    owners,
    preview: input.visual
      ? previewStoryUrl(preview, input.slug, input.options[0]?.key ?? "a")
      : "none",
    context: input.context,
    options,
  })
}

function recordPath(
  workspace: Workspace,
  directory: string,
  day: string,
  slug: string,
): { relative: string; absolute: string } {
  const relative = `${directory.replace(/\/$/, "")}/${day}-${slug}.md`
  return { relative, absolute: path.resolve(workspace.workspaceRoot, relative) }
}

function validateNode(
  workspace: Workspace,
  input: DesignRequestInput,
  record: string,
): {
  registryFile: string
  registry: Registry
  updated: Registry
} | null {
  if (!input.nodeId) return null
  const inventory = readInventory(workspace.root)
  if (!inventory.components.some((node) => node.nodeId === input.nodeId))
    throw new UsageError(`${input.nodeId} is not in the inventory`)
  const registryFile = committedFile("registry", workspace.root)
  const registry = readRegistry(workspace.root)
  const entry = registry.entries[input.nodeId]
  if (entry?.status !== "pending")
    throw new UsageError(`${input.nodeId} must remain pending while its design request is open`)
  const pointer = `Design request: ${record}`
  // A reopened slug after a deleted record meets its own pointer again; appending
  // it twice would grow the note for no reason.
  const note = entry.note?.includes(pointer)
    ? entry.note.trim()
    : [entry.note?.trim(), pointer].filter(Boolean).join("\n")
  if (note.length > NOTE_LENGTH_LIMIT)
    throw new UsageError(
      `${input.nodeId} registry note would exceed ${NOTE_LENGTH_LIMIT} characters`,
    )
  const updated = {
    ...registry,
    entries: { ...registry.entries, [input.nodeId]: { ...entry, note } },
  }
  return { registryFile, registry, updated }
}

export function openDesignRequest(
  workspace: Workspace,
  inputFile: string,
  day: string,
  dryRun: boolean,
  gh: IssueCommand = runGh,
): {
  path: string
  issueUrl: string | null
  actions: string[]
  dryRun: boolean
} {
  const input = parseInput(fs.readFileSync(inputFile, "utf8"))
  const config = designPaths(readFigmaConfig(workspace))
  const target = recordPath(workspace, config.requests, day, input.slug)
  // A record that already exists is refused rather than rewritten: `gh issue
  // create` would ask the same question a second time, and overwriting the note
  // would leave the issue and the record disagreeing about what is being asked.
  if (fs.existsSync(target.absolute)) {
    const existing = readDesignRequestRecord(fs.readFileSync(target.absolute, "utf8"))
    if (existing.state !== "open")
      throw new UsageError(
        `design request record ${target.relative} is ${existing.state} — open a new slug for a new question`,
      )
    const issue = existing.issueUrl ? ` (${existing.issueUrl})` : ""
    throw new UsageError(
      `design request record ${target.relative} already exists${issue} — edit it, or open a new slug`,
    )
  }
  const node = validateNode(workspace, input, target.relative)
  if (input.rulesCard)
    markRule(workspace, {
      cardId: input.rulesCard,
      disposition: "conflict",
      request: target.relative,
      dryRun: true,
    })
  const labels = [
    input.type === "design" ? "type/design-question" : "type/dev-decision",
    "status/needs-answer",
  ]
  if (input.rulesCard) labels.push("source/figma-rules")
  const title = `[${input.type === "design" ? "design" : "dev"}] ${input.title}`
  const body = issueBody(input, config.preview, config.previewBranch)
  const create = ["issue", "create", "--title", title, "--body", body]
  for (const label of labels) create.push("--label", label)
  for (const owner of config.owners) create.push("--assignee", owner)
  const actions = [
    `gh ${create.join(" ")}`,
    `write ${target.relative}`,
    ...(node ? [`write registry note for ${input.nodeId}`] : []),
    ...(input.rulesCard
      ? [`mark rules card ${input.rulesCard} as conflict -> ${target.relative}`]
      : []),
  ]
  if (dryRun) return { path: target.relative, issueUrl: null, actions, dryRun: true }
  const output = gh(create, workspace.workspaceRoot)
  const issueUrl =
    output.split(/\s+/).find((word) => /^https:\/\/[^\s]+\/issues\/\d+$/.test(word)) ?? null
  if (!issueUrl) throw new Error(`gh issue create did not return an issue URL: ${output}`)
  fs.mkdirSync(path.dirname(target.absolute), { recursive: true })
  writeText(target.absolute, recordContent(input, issueUrl, config.owners, config.preview))
  if (node) {
    writeJson(node.registryFile, node.updated)
    forgetCommitted(node.registryFile)
  }
  if (input.rulesCard)
    markRule(workspace, {
      cardId: input.rulesCard,
      disposition: "conflict",
      request: target.relative,
    })
  return { path: target.relative, issueUrl, actions, dryRun: false }
}

export function listDesignRequests(
  workspace: Workspace,
  state: "answered" | "waiting",
  gh: IssueCommand = runGh,
): unknown {
  const label = state === "answered" ? "status/answered" : "status/needs-answer"
  return JSON.parse(
    gh(
      [
        "issue",
        "list",
        "--label",
        label,
        "--state",
        "open",
        "--json",
        "number,title,url,assignees,labels",
      ],
      workspace.workspaceRoot,
    ),
  )
}

export function closeDesignRequest(
  workspace: Workspace,
  recordFile: string,
  decision: string,
  commit: string,
  dryRun: boolean,
  gh: IssueCommand = runGh,
): {
  issueUrl: string
  commitUrl: string
  path: string
  actions: string[]
  openPoints: string[]
  dryRun: boolean
} {
  if (!decision.trim()) throw new UsageError("request close needs --decision")
  if (!/^[0-9a-f]{7,40}$/i.test(commit))
    throw new UsageError("request close --commit must be a Git commit SHA")
  const absolute = path.isAbsolute(recordFile)
    ? path.resolve(recordFile)
    : path.resolve(workspace.workspaceRoot, recordFile)
  const relativePath = path.relative(workspace.workspaceRoot, absolute)
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath))
    throw new UsageError("request record must be inside the workspace")
  const source = fs.readFileSync(absolute, "utf8")
  const url = readDesignRequestRecord(source).issueUrl
  if (!url) throw new UsageError("request record has no issue URL")
  const repo = url.match(/^(https:\/\/[^/]+\/[^/]+\/[^/]+)\/issues\/\d+$/)?.[1]
  if (!repo) throw new UsageError("request issue URL is not a GitHub issue URL")
  // The writer refuses a record it cannot answer: an unreadable status, an
  // answered one, or one with no `## Decision` to write into.
  const updated = answeredRecordSource(source, decision)
  const commitUrl = `${repo}/commit/${commit}`
  const actions = [
    `gh issue edit ${url} --remove-label status/needs-answer --add-label status/answered`,
    `gh issue comment ${url} --body "Decision recorded in ${commitUrl}"`,
    `gh issue close ${url}`,
    `write ${workspace.identity(absolute)}`,
  ]
  if (!dryRun) {
    gh(
      [
        "issue",
        "edit",
        url,
        "--remove-label",
        "status/needs-answer",
        "--add-label",
        "status/answered",
      ],
      workspace.workspaceRoot,
    )
    gh(
      ["issue", "comment", url, "--body", `Decision recorded in ${commitUrl}`],
      workspace.workspaceRoot,
    )
    gh(["issue", "close", url], workspace.workspaceRoot)
    writeText(absolute, updated)
  }
  return {
    issueUrl: url,
    commitUrl,
    path: workspace.identity(absolute),
    actions,
    openPoints: [
      "remove the review story while keeping its captures",
      "update the review pull request slug → issue URL index",
    ],
    dryRun,
  }
}
