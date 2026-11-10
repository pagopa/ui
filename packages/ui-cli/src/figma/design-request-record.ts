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
// With the `m` flag, `$` matches before `\r` and at the end of the record, so
// the parser finds the heading in a CRLF record and in one that ends at the
// heading. The writer captures that same heading plus the line ending after
// it, so it fills the decision in the same forms rather than requiring an LF.
const DECISION_SECTION = new RegExp(`(${DECISION_HEADING.source})(\\r?\\n|$)[\\s\\S]*$`, "m")

export function readDesignRequestRecord(source: string): DesignRequestRecord {
  const issueUrl = source.match(ISSUE_LINE)?.[1] ?? null
  const raw = source.match(STATUS_LINE)?.[1]?.trim() ?? null
  const word = raw?.match(/^[A-Za-z]+/)?.[0]?.toLowerCase() ?? null
  const state: RequestState = word === "open" || word === "answered" ? word : "unreadable"
  const heading = source.match(DECISION_HEADING)
  const body = heading?.index === undefined ? null : source.slice(heading.index + heading[0].length)
  const decision = body === null ? null : body.replace(/^[ \t]*(?:\r?\n)+/, "").trimEnd()
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
      // replacement never fires and the decision is silently dropped. The
      // callback matters too: as a replacement string, `$&`, `$1` and `$$` in
      // the decision would be read as patterns and rewrite the answer. The
      // line ending follows the heading, or the record when the heading is the
      // last line, so a CRLF record stays CRLF.
      .replace(DECISION_SECTION, (_match, heading: string, separator: string) => {
        const lineEnding = separator || (source.includes("\r\n") ? "\r\n" : "\n")
        return `${heading}${lineEnding}${lineEnding}${decision.trim()}${lineEnding}`
      })
  )
}
