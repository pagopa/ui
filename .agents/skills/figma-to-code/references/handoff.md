# Drift handoff

A drift pull request carries the refreshed inventory, queued delta and
evidence. Align on its head branch; the person pushes and merges.

## Start

1. `pnpm ui-cli figma handoff resolve <pr-or-url-or-branch> --json` identifies
   the open target. Without a reference it requires exactly one open drift pull
   request. A closed/merged or ambiguous target stops the handoff.
2. Run status and the source gate in `init.md` before changing files. A missing token blocks only REST; Storybook is required
   for the render.
3. If the active worktree is already on the resolved head branch, use it.
   Otherwise preview `pnpm ui-cli figma handoff checkout <pr> --dry-run --json`,
   then run it without `--dry-run` under the session's filesystem permissions.
   It fetches the head, creates a sibling worktree named for the branch and
   installs dependencies.
   Continue in its reported path. A destination holding something other than a
   worktree is a blocker, not permission to delete it.
4. `pnpm ui-cli figma handoff brief <pr> --json` batches the PR body, delta
   artifact and local pending briefs. Read both the PR order and the local
   order; stale/absent artifact data must not silently change scope.

**Done when** the correct branch is active, the source gate passes, and every
requested node has its delta class, target, constraints and devices.

## Work

Follow the handoff's `implementationOrder`, dependencies first, one node at a
time; `delta.md` holds the queue read and the decision procedure.
Use `pnpm ui-cli figma brief --queue --refresh` for the delta's own briefs, and
the node brief again when a node's context changes.

Record decisions through `figma registry set`
(`catalogue/statuses.md`). Cases, rules and guides travel
with the implementation. Source/render inspection and the parity loop in `visual-parity.md` remain
required; a draft is not coverage.
Changes to comparison tools, the public API, tokens or these instructions
require an explicit decision; a mismatch alone is not permission to relax them.
If commits were requested, keep one commit per node on this branch, with the
full green chain before each commit.

## Checks and delivery

Use [shared completion](definition-of-done.md#closing-and-delivery).
Before handoff, also run the scoped baseline preflight in
[Visual regression](../../../../CONTRIBUTING.md#visual-regression) against the
pull request base: the scoped run is the session's visual obligation, and the
whole-catalogue comparison belongs to the nightly and the release pull request.
Missing Linux images remain a finding until the update
workflow's baselines are reviewed and the visual check reruns.

### Before / after media

After authorized delivery, with a clean committed tree and Storybook answering:

```sh
pnpm ui-cli figma handoff media --pr <n> --base <ref> --dry-run --json
pnpm ui-cli figma handoff media --pr <n> --base <ref> --json
```

The CLI selects changed mapped nodes/cases, captures base and head with the same
story, viewport and clip, restores source files, attaches one comment and checks
the uploaded URLs. Identical frames become a line rather than a pair. It reads
`STORYBOOK_URL` when a session serves its own Storybook on another port.

**Done when** every node whose render moved has a verified before/after pair,
every unchanged render is explained, and the working tree is restored.
Inspect the result: the helper does not replay arbitrary saved `fill`, `click`
or focus-selector interactions, nor discover all indirect token/artwork
dependants. For those cases, reproduce the saved state and capture both
revisions explicitly; report missing pairs as unverified. Generated comment
text does not replace the decision/reason report.
