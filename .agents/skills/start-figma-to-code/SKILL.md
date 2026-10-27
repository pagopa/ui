---
name: start-figma-to-code
description: Take a Figma drift pull request to a reviewable state, one node at a time. Use when the person explicitly asks to start or take a drift pull request, says "start figma to code", names a branch like figma-drift/<date>, or invokes /start-figma-to-code.
disable-model-invocation: true
---

# Start Figma to code

Take a Figma drift pull request to a reviewable state.

The person names the target in their request: a pull request number, a URL, or a
`figma-drift/<date>` branch. When the target is missing, use the open pull
request whose head branch starts with `figma-drift/`, and say which one you
picked.

Load and follow the `figma-to-code` skill (drift handoff and delta references)
and the `pagopa-ui-standards` skill. They own every rule; this skill only scopes
the session.

## Start

1. Resolve the pull request:
   `gh pr view <number> --json number,headRefName,state,body`.
   **Done when** the head branch and state are known. A merged or closed pull
   request stops the session here: report it and never reopen it.
2. `pnpm nx run pagopa-ui-cli:figma:status` and report the token state.
   Without `FIGMA_TOKEN`, work from the committed evidence and say so.
3. Check out the head branch in a worktree as `handoff.md` says.
   **Done when** the worktree is on that branch and `pnpm install` has run.
4. Read the pull request body and its `delta.json` artifact, then
   `figma:brief --node <id>` for every queued node.
   **Done when** every queued node has its brief, its target and its devices.

## Work

- Follow `implementationOrder`, one node at a time, one commit per node, on the
  pull request head branch.
- Inspect every declared device and run the committed cases. Parity is the
  render: a code read is not evidence.
- Take exactly one decision per node: `new-from-figma.md`, `node-review.md`,
  `exclude`, or `design-request.md`.
- A design request keeps the node `pending`: write the record, name it in the
  registry note, then continue with the next node. Never implement an answer
  that does not exist. A visual question lands on `design.preview.branch` and
  its one review pull request, never a second one.
- Record every decision in `src/catalog/figma/registry.json`. Set `implemented`
  only after inspecting the render of every declared device.
- Leave no rule that targets a touched node `pending` or `stale`.

**Done when** every node in `implementationOrder` is either `implemented` with a
reviewed render, or `pending` with its design request or blocker named.

## Close

- `pnpm nx run pagopa-ui-cli:figma:parity:verify`, then the full green chain
  from `CONTRIBUTING.md`. Stories run in a browser: when they cannot start, say
  so and never count them as passed.
- Commit on the drift branch only. The session stops before push, merge or pull
  request: the person delivers, and the merge is the review record.
- Report per node the decision and its reason, per device the verdict, the
  residues with their reasons, the open requests, the files touched, every
  command with its exit code, and the commits.
