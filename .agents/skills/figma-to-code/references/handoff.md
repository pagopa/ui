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

### Before / after media

The drift pull request carries its visible change: one comment holding a pair of
captures per node whose render moved, so the reviewer sees it without starting
Storybook. Its generated body already asks each node for its local render: the
comment is where those renders land. It runs once the pull request exists — on
the delivery the person asked for, or after their own push.

A node whose source moved without moving the render — a `FILL`→`HUG` relaxation,
a case recaptured at the corrected width — is one line of the same comment
instead of a pair.

1. **Start Storybook** — `pnpm nx run pagopa-ui-storybook:storybook` — and
   confirm `http://localhost:6006/iframe.html` answers.
2. **Capture the "before" pair** from the base commit's file:
   `git show <base>:<path> > <path>` runs the pre-alignment component under the
   same story. Then `git checkout -- <path>` and confirm `git status` is clean.
3. **Capture the "after" pair** from the committed tree, so the last frame is the
   code the pull request ships. Both captures come from a scratch script beside
   `packages/ui-cli`, which already depends on `playwright`: open
   `iframe.html?id=<storyId>&viewMode=story`, press `Tab` when the case's state is
   focus, use `deviceScaleFactor: 2`, clip the band the change lives in, and read
   the root's `boundingBox()` against the source numbers. Same story, viewport,
   device, state and clip in both, so the frames differ by the change and by
   nothing else; two identical frames mean the render never moved, and that node
   belongs to the line above.
4. **Comment** with `gh` 2.99 or later:
   `gh pr comment <n> --repo <owner>/<repo> --body-file comment.md --attach ./before.png --attach ./after.png`,
   the body naming each node, its decision and the bare file names (`before.png`,
   `after.png`) that `gh` rewrites into the uploaded URLs.
5. **Read it back**:
   `gh pr view <n> --json comments --jq '.comments[] | select(.url == "<url>") | .body'`.

**Done when** every node whose render moved is named in the comment, the
read-back body carries one `user-attachments/assets/` URL per captured frame and
no local path, and the scratch script and the PNGs are deleted.

## Guardrails

- Figma is read-only.
- The comparison tools, the public API, the tokens and these instructions change
  only with an explicit decision.
- `implemented` follows a reviewed render; a node without one stays `pending`.
- One node, one decision, one commit.
