// The design-request record is a Markdown file whose front block is the only
// machine-readable part of it: `- Issue:`, `- Status:` and the `## Decision`
// section. Three readers used to parse it on their own — the session report's
// state counter, `request close`'s transition and `request record`'s writer —
// and they disagreed: the counter treated any status word other than `open` as
// `answered`, so a record with no status line, or with a typo in it, was
// counted as answered and silently dropped out of the open list. The parser
// below is the only reader, and an unreadable status is a state of its own
// rather than a silent `open`.
import { UsageError } from "../lib/command.ts"

export type RequestState = "open" | "answered" | "unreadable"

export type DesignRequestRecord = {
  /** The GitHub issue the record was opened for, when the record names one. */
  issueUrl: string | null
  state: RequestState
  /** The status word as written, for an `unreadable` record's diagnosis. */
  raw: string | null
  /** The body under `## Decision`, or null when the record has no such section. */
  decision: string | null
}

const STATUS_LINE = /^\s*-?\s*\**Status\**:[ \t]*(.*)$/m
const ISSUE_LINE = /^\s*-?\s*\**Issue\**:[ \t]*(https:\/\/\S+)/m
const DECISION_HEADING = /^## Decision[ \t]*$/m

export function readDesignRequestRecord(source: string): DesignRequestRecord {
  const issueUrl = source.match(ISSUE_LINE)?.[1] ?? null
  const raw = source.match(STATUS_LINE)?.[1]?.trim() ?? null
  const word = raw?.match(/^[A-Za-z]+/)?.[0]?.toLowerCase() ?? null
  const state: RequestState = word === "open" || word === "answered" ? word : "unreadable"
  const heading = source.match(DECISION_HEADING)
  const body = heading?.index === undefined ? null : source.slice(heading.index + heading[0].length)
  const decision = body === null ? null : body.replace(/^[ \t]*\n+/, "").trimEnd()
  return { issueUrl, state, raw, decision }
}

/** The record a design request is opened with. */
export function openRecord(fields: {
  title: string
  type: "design" | "dev"
  issueUrl: string
  owners: string[]
  preview: string
  context: string
  options: string
}): string {
  return [
    `# ${fields.title}`,
    "",
    `- Type: ${fields.type}`,
    `- Issue: ${fields.issueUrl}`,
    `- Status: open`,
    `- Decision owner: ${fields.owners.map((owner) => `@${owner}`).join(", ") || "unassigned"}`,
    `- Preview: ${fields.preview}`,
    "",
    "## Context",
    "",
    fields.context,
    "",
    "## Options",
    "",
    fields.options,
    "",
    "## Decision",
    "",
  ].join("\n")
}

/**
 * The record with its decision filled in and its status moved to `answered`.
 * A record that is not open cannot be answered twice, and a record with no
 * `## Decision` section has nowhere to put the decision: both are errors here
 * rather than a rewrite that quietly loses the text.
 */
export function answeredRecordSource(source: string, decision: string): string {
  const record = readDesignRequestRecord(source)
  if (record.state === "unreadable")
    throw new UsageError(
      `request record has no readable "- Status:" line (found ${record.raw === null ? "none" : `"${record.raw}"`}) — set it to open or answered`,
    )
  if (record.state === "answered") throw new UsageError("request record is already answered")
  if (!record.issueUrl) throw new UsageError("request record has no issue URL")
  if (record.decision === null) throw new UsageError("request record has no Decision section")
  return (
    source
      .replace(STATUS_LINE, "- Status: answered")
      // `m` matters: without it `^` only matches at the start of the record, the
      // replacement never fires and the decision is silently dropped.
      .replace(/(^## Decision[ \t]*\n)[\s\S]*$/m, `$1\n${decision.trim()}\n`)
  )
}
