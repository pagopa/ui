# Drift handoff

A drift pull request is a complete handoff: the branch already carries the
refreshed inventory, the queued delta and the evidence. Align it one node at a
time; the person pushes and merges.

## Start

1. Create a worktree from the drift branch:

   ```sh
   git fetch origin
   git worktree add ../pagopa-ui-drift -b figma-drift/<date> origin/figma-drift/<date>
   cd ../pagopa-ui-drift
   pnpm install
   ```

2. Run the MCP gate and the session report ([init.md](init.md) §2). A session
   without the MCP stops here, before its first file change; a missing
   `FIGMA_TOKEN` only narrows the REST targets. Storybook is required for the
   render.
3. Read the handoff: the pull request body and its `delta.json` artifact
   (`counts`, `nodes`, `implementationOrder`, the device and coverage
   summaries), then the registry note of each node.

## Work

In `implementationOrder`, one node at a time, one commit per node. Pick the
branch:

- a delta node → [delta.md](delta.md) step 4;
- a new implementation → [new-from-figma.md](new-from-figma.md);
- a review → [node-review.md](node-review.md);
- an open question for the design owner → [design-request.md](design-request.md);
  the node stays `pending`.

A draft case is not coverage. Three fix passes per case, then a residue with a
reason or a written blocker.

## Checks

The closing checks of this skill, plus `pnpm nx run pagopa-ui-cli:figma:parity:verify`
before the green chain. A slice that no longer matches the committed inventory
exits 2: refresh it with the evidence command or use the current snapshot.

## Delivery

Commit the alignment on the drift branch. The person pushes, reviews and merges;
the session stops before push, merge or pull request.

## Guardrails

- Figma is read-only.
- The comparison tools, the public API, the tokens and these instructions change
  only with an explicit decision.
- `implemented` follows a reviewed render; a node without one stays `pending`.
- One node, one decision, one commit.
