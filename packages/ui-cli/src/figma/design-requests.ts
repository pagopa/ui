import fs from "node:fs"
import { z } from "zod"
import type { Workspace } from "../adapters/workspace.ts"
import { runGh } from "../adapters/handoff.ts"
import { writeJson } from "../lib/json.ts"
import { UsageError } from "../lib/command.ts"
import { NOTE_LENGTH_LIMIT, type Registry } from "../schemas/catalogue.ts"
import {
  committedFile,
  forgetCommitted,
  readInventory,
  readRegistry,
} from "../records/committed.ts"
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

// What the validation-only card pass names in place of the issue URL it cannot
// know yet: the `.invalid` host keeps the string from ever reading as a real
// question, and the pass is never written.
const REQUEST_PLACEHOLDER = "https://placeholder.invalid/issues/0"

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

/** The node a request blocks: it must exist and stay `pending` while the question is open. */
function pendingNode(
  workspace: Workspace,
  input: DesignRequestInput,
): {
  registryFile: string
  registry: Registry
  entry: Registry["entries"][string]
} | null {
  if (!input.nodeId) return null
  const inventory = readInventory(workspace.root)
  if (!inventory.components.some((node) => node.nodeId === input.nodeId))
    throw new UsageError(`${input.nodeId} is not in the inventory`)
  const registry = readRegistry(workspace.root)
  const entry = registry.entries[input.nodeId]
  if (entry?.status !== "pending")
    throw new UsageError(`${input.nodeId} must remain pending while its design request is open`)
  return { registryFile: committedFile("registry", workspace.root), registry, entry }
}

/**
 * The registry note with the issue URL appended. The pointer is an issue URL
 * rather than a record path, so it is only known once `gh issue create` has
 * answered: the note is built here, after the create, and the error names the
 * issue so a note that cannot hold the pointer does not lose it.
 */
function pointerNote(
  input: DesignRequestInput & { nodeId: string },
  entry: Registry["entries"][string],
  issueUrl: string,
): string {
  const pointer = `Design request: ${issueUrl}`
  // A re-run after a closed request meets its own pointer again; appending it
  // twice would grow the note for no reason.
  const note = entry.note?.includes(pointer)
    ? entry.note.trim()
    : [entry.note?.trim(), pointer].filter(Boolean).join("\n")
  if (note.length > NOTE_LENGTH_LIMIT)
    throw new UsageError(
      `${input.nodeId} registry note would exceed ${NOTE_LENGTH_LIMIT} characters — ${issueUrl} is open: shorten the note, then re-run`,
    )
  return note
}

/**
 * The open issue that already asks this question. The record file was the guard
 * against asking twice — a second `gh issue create` would ask the same owner the
 * same thing — and the tracker answers for it now.
 */
function openQuestion(workspace: Workspace, title: string, gh: IssueCommand): string | null {
  const output = gh(
    [
      "issue",
      "list",
      "--state",
      "open",
      "--search",
      `${title} in:title`,
      "--json",
      "number,title,url",
    ],
    workspace.workspaceRoot,
  )
  const found: Array<{ title?: string; url?: string }> = JSON.parse(output)
  return found.find((issue) => issue.title === title)?.url ?? null
}

export function openDesignRequest(
  workspace: Workspace,
  inputFile: string,
  dryRun: boolean,
  gh: IssueCommand = runGh,
): {
  issueUrl: string | null
  actions: string[]
  dryRun: boolean
} {
  const input = parseInput(fs.readFileSync(inputFile, "utf8"))
  const config = designPaths(readFigmaConfig(workspace))
  // The node is checked before anything is written: an issue opened for a node
  // that is not pending would be a question nobody has to answer.
  const node = pendingNode(workspace, input)
  const labels = [
    input.type === "design" ? "type/design-question" : "type/dev-decision",
    "status/needs-answer",
  ]
  if (input.rulesCard) labels.push("source/figma-rules")
  const title = `[${input.type === "design" ? "design" : "dev"}] ${input.title}`
  const body = issueBody(input, config.preview, config.previewBranch)
  // The card is checked before anything is written: `gh issue create` cannot be
  // undone, and a stale or placeholder `--rules-card` would otherwise leave an
  // open issue, a registry note pointing at it and an unmarked card, with the
  // duplicate guard refusing every re-run. The URL the card will name is only
  // known after the create, so the dry run carries a placeholder — every other
  // check (the card exists, is not a placeholder, the snapshot and the ledger
  // are readable) runs here.
  if (input.rulesCard)
    markRule(workspace, {
      cardId: input.rulesCard,
      disposition: "conflict",
      request: REQUEST_PLACEHOLDER,
      dryRun: true,
    })
  const existing = openQuestion(workspace, title, gh)
  if (existing)
    throw new UsageError(`${existing} already asks this question — answer it, or open a new slug`)
  const create = ["issue", "create", "--title", title, "--body", body]
  for (const label of labels) create.push("--label", label)
  for (const owner of config.owners) create.push("--assignee", owner)
  const actions = [
    `gh ${create.join(" ")}`,
    ...(node ? [`write registry note for ${input.nodeId}`] : []),
    ...(input.rulesCard ? [`mark rules card ${input.rulesCard} as conflict -> the issue URL`] : []),
  ]
  if (dryRun) return { issueUrl: null, actions, dryRun: true }
  const output = gh(create, workspace.workspaceRoot)
  const issueUrl =
    output.split(/\s+/).find((word) => /^https:\/\/[^\s]+\/issues\/\d+$/.test(word)) ?? null
  if (!issueUrl) throw new Error(`gh issue create did not return an issue URL: ${output}`)
  if (node) {
    const nodeId = input.nodeId
    if (!nodeId) throw new UsageError("the registry note needs a node id")
    const note = pointerNote({ ...input, nodeId }, node.entry, issueUrl)
    writeJson(node.registryFile, {
      ...node.registry,
      entries: {
        ...node.registry.entries,
        [nodeId]: { ...node.entry, note },
      },
    })
    forgetCommitted(node.registryFile)
  }
  // The rule card names the issue for the same reason the registry note does:
  // the tracker is the only home, so a card points at it rather than at a file.
  if (input.rulesCard)
    markRule(workspace, {
      cardId: input.rulesCard,
      disposition: "conflict",
      request: issueUrl,
    })
  return { issueUrl, actions, dryRun: false }
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

/** The issue a close names: a full URL, or a number read back through `gh`. */
export function requestIssueUrl(workspace: Workspace, issue: string, gh: IssueCommand): string {
  const trimmed = issue.trim()
  if (/^\d+$/.test(trimmed)) {
    const url = gh(
      ["issue", "view", trimmed, "--json", "url", "--jq", ".url"],
      workspace.workspaceRoot,
    )
    if (!url.trim()) throw new UsageError(`issue ${trimmed} did not resolve to a URL`)
    return url.trim()
  }
  if (/^https:\/\/[^\s/]+\/[^\s/]+\/[^\s/]+\/issues\/\d+$/.test(trimmed)) return trimmed
  throw new UsageError(`"${trimmed}" is neither an issue URL nor an issue number`)
}

export function closeDesignRequest(
  workspace: Workspace,
  issue: string,
  decision: string,
  commit: string,
  dryRun: boolean,
  gh: IssueCommand = runGh,
): {
  issueUrl: string
  commitUrl: string
  actions: string[]
  openPoints: string[]
  dryRun: boolean
} {
  if (!decision.trim()) throw new UsageError("request close needs --decision")
  if (!/^[0-9a-f]{7,40}$/i.test(commit))
    throw new UsageError("request close --commit must be a Git commit SHA")
  const url = requestIssueUrl(workspace, issue, gh)
  const repo = url.match(/^(https:\/\/[^/]+\/[^/]+\/[^/]+)\/issues\/\d+$/)?.[1]
  if (!repo) throw new UsageError("request issue URL is not a GitHub issue URL")
  const commitUrl = `${repo}/commit/${commit}`
  // The answer is a comment, not a file: the record used to hold the decision
  // and the issue only linked to it, so the answer the owner's successors read
  // lived outside the place the owner replied in.
  const body = `${decision.trim()}\n\nRecorded in ${commitUrl}`
  const actions = [
    `gh issue edit ${url} --remove-label status/needs-answer --add-label status/answered`,
    `gh issue comment ${url} --body "<decision> — Recorded in ${commitUrl}"`,
    `gh issue close ${url}`,
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
    gh(["issue", "comment", url, "--body", body], workspace.workspaceRoot)
    gh(["issue", "close", url], workspace.workspaceRoot)
  }
  return {
    issueUrl: url,
    commitUrl,
    actions,
    openPoints: [
      "remove the review story while keeping its captures",
      "update the review pull request slug → issue URL index",
    ],
    dryRun,
  }
}
