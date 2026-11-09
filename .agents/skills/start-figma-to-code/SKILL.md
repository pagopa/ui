---
name: start-figma-to-code
description: Take a Figma drift pull request to a reviewable state, one node at a time.
disable-model-invocation: true
---

# Start Figma to code

Scope a drift-handoff session. Load `figma-to-code` and `pagopa-ui-standards`;
they own source alignment and component quality respectively.

1. Run `pnpm ui-cli figma handoff resolve <pr-or-url-or-branch> --json`.
   Omit the reference only when the person named none: the CLI selects the
   unique open drift pull request, and rejects an absent or ambiguous target.
   **Done when** the open pull request and head branch are known and reported.
   A closed or merged target ends the session without reopening it.
2. Follow [the shared handoff](../figma-to-code/references/handoff.md#start).
   **Done when** the source gate passes, the correct worktree is active, and the
   handoff's delta and ordered node briefs have been read.
3. Work in the handoff's dependency order, one node at a time, using
   [its decision loop](../figma-to-code/references/handoff.md#work).
   **Done when** every requested node has a reviewed decision or a named
   pending request/blocker; every implemented node covers its declared devices.
4. Follow [shared completion](../figma-to-code/references/definition-of-done.md#closing-and-delivery).
   Report the reviewable result, committed on the drift branch; push and merge
   stay with the person. A blocked gate is reported, not passed.
