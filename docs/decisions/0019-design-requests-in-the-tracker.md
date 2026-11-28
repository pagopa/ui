# ADR-0019 — A design request is an issue, and the tracker is its only home

- **Status:** Accepted — 2026-11-28.
- **Date:** 2026-11-28
- **Context:** `design.requests` made `docs/design-requests/` the system of record
  for the questions opened to the design owner: `figma request open` wrote
  `<date>-<slug>.md`, `figma request close` rewrote it, and the registry, the
  rules cards, the page surface and the foundation exceptions pointed at the
  file. The question itself was already an issue — opened by the same command,
  assigned to `design.owners`, labelled, carrying the options and the
  recommendation — so every request was written twice and the two copies drifted.
  The triage found three of the twenty-nine mirrors out of step with their issue:
  one closed in the tracker and open in the file, one answered in the file and
  waiting in the tracker, one answered with no state on either side.
- **Related:** [ADR-0007](./0007-committed-records-reader.md) (the committed
  records the reader owns; §8 records this decision's effect on it),
  [ADR-0009](./0009-ratified-design-defaults.md) (the defaults applied before a
  request is opened at all).

## 1. Problem

A record that exists twice has no owner.

- **The state was in the file and the conversation was in the issue.** The
  `- Status: open|answered` line was what `figma status` counted, and the answer
  was what a person typed in the issue. Closing a request had to update both,
  and only the CLI did it in order; a person closing an issue in the tracker left
  the file claiming it still waited.
- **The file was invisible to the person being asked.** The issue was not: it
  carried the notification, the assignment and the labels. The mirror only ever
  served the sessions reading the catalogue.
- **The mirror was a second place to search and a second place to keep.** The
  duplicate-title check read a directory, the catalogue coverage counted files,
  the docs tree had a section for them, and `nx.json` listed the folder as a
  check input — machinery for a copy.

## 2. Decision

The issue is the record. Nothing is mirrored into the repository.

- **`open` writes the issue and points at it.** After `gh issue create`, the CLI
  appends the issue URL to the node note, points the rules card at it when one is
  supplied, and refuses a title the tracker already asks (`gh issue list
  --search "<title> in:title"`), which is the duplicate guard the record-file
  existence check used to be.
- **`close` takes an issue and comments the answer.** The positional is the issue
  URL or its number; the CLI comments `<decision>` with the commit URL, moves the
  labels to `status/answered` and closes the issue. There is no file to rewrite.
- **One pointer syntax.** A note, a rules card, a page-surface row and a
  foundation exception all carry the absolute issue URL, and `issuePointers()` is
  the single reader. The pattern is host-agnostic rather than derived from
  `origin`, so a fork or an enterprise host needs no configuration.
- **`figma status` stopped counting requests.** The module is read-only and makes
  no network call, so the report carries the linked URLs pending nodes point at
  and nothing else. The open/answered census is `figma request list`, which asks
  the tracker. The advisory about stale mirrors and the rung that told a session
  to set `- Status:` are deleted with the state they described.
- **`design.requests` leaves the config.** Paths in a Figma config are relative to
  its folder; a request is not a path, so the key has no successor.

## 3. Consequences

- **The catalogue points outwards.** `check catalogue` validates that a pointer is
  an issue URL, not that a file exists, so a request closed as stale or moved
  never breaks a gate. A gate that reads the tracker would need a token and a
  network call; none does.
- **The preview branch stays.** Retiring the mirror says nothing about the
  standalone `Reviews/<slug>` story, the captures or the open review pull
  request that indexes them: those are how a visual question is shown, and they
  remain on `design.previewBranch`. See
  [#19](https://github.com/pagopa/ui/issues/19).
- **The mirror's contents were kept.** All twenty-nine records were moved
  verbatim into their issues as a `### The record` comment before the folder was
  deleted, so an issue holds the question, the conversation and the answer.
- **ADR-0007 §7's writer list shortens by one.** `design-requests.ts` no longer
  writes a committed record, so it carries no invalidation obligation. `setRegistry`,
  `catalogue/finish.ts` and `catalogue-refresh.ts` keep theirs; the rule itself is
  unchanged, because a committed record the reader hands out is still shared.
