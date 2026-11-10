# Catalogue statuses

A status is a promise, not a progress bar.

- `implemented` — the source was inspected and the render compared. The entry
  carries `target.module`, `target.export`, `target.story` and explicit
  `target.storyExports`.
- `mocked` — the API exists to keep a demo alive; it carries a note and is not
  renewed.
- `excluded` — the node is deliberately not part of the library; it carries the
  reason, and the reason is the judgement a reader needs.
- `pending` — work is blocked on a named request or blocker. A pending entry
  without its blocker is a dropped node.

## Review semantics

- Historical nodes are reviewed on request only. Silence is not approval.
- A consolidated rule that targets the node needs a disposition; `pending` and
  `stale` are failures, not states to live with.
- The consumer-facing rules are the guide's first block, with no source reference
  in the text. The source vocabulary stays in the mapping paragraph.
- An exclusion that turns out to be a design gap becomes a design request, not a
  quietly wrong implementation.

`pnpm nx run pagopa-ui:check:catalogue` reports every field these statuses
require and names the command for each.
