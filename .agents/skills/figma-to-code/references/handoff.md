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
   order; stale/absent artifact data must not silently change scope. The brief
   reports which one it used: `orderSource` is `delta` when the artifact's
   `implementationOrder` resolves and `queue` when the run fell back, and
   `dropped` names the ids the artifact ordered that the queue no longer carries
   — both mean the handoff's order is not the artifact's, so say so. Its `delta`
   field is the artifact's identity and order (`source`, `path`,
   `implementationOrder`), never the artifact itself: a saved delta runs to
   hundreds of megabytes, and a brief embedding it cannot be printed. Only
   `.figma/delta.json` and `.figma/live-delta.json` count as a local delta;
   `.figma/plan.json` is a catalogue plan, it orders the whole work set rather
   than this pull request's, so it is never read and a plan-only tree reports
   `delta: null` with the queue's order. When `delta` is `null`, read the same
   pending briefs directly with `pnpm ui-cli figma brief --queue --full --json`
   and report that the order came from the queue, not a delta.

**Done when** the correct branch is active, the source gate passes, and every
requested node has its delta class, target, constraints and devices.

## Work

Follow the handoff's `implementationOrder`, dependencies first, one node at a
time; `delta.md` holds the queue read and the decision procedure.
Use `pnpm ui-cli figma brief --queue --refresh` for the delta's own briefs, and
the node brief again when a node's context changes.

Record decisions through `record` (`catalogue/statuses.md`), one atomic run per
node. Cases, rules and guides travel with the implementation. Source/render
inspection and the alignment loop in `visual-parity.md` remain required
([commands](commands.md)); a draft is not coverage.
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

Nothing captures this pair for you: there is no saved case to plan from, so the
session that changed the render is the session that shows it. When the pull
request needs the pair, capture it while both revisions are at hand.

1. Name the nodes whose render moved — the ones the diagnostic reported
   residues for, plus any whose story you touched.
2. For each, capture the story at the same width, viewport and root on the base
   revision and on the head revision: `git stash` or a scratch checkout of the
   base, Storybook answering on its own port, the same story id, one screenshot
   each. Read `STORYBOOK_URL` when a session serves Storybook elsewhere than
   `http://localhost:6006`.
3. Attach the pair to the pull request, one comment per node, and state the
   width used. Identical frames do not need a pair: say the render did not move.

**Done when** every node whose render moved has a verified before/after pair,
every unchanged render is explained, and the working tree is restored. A saved
`fill`, `click` or focus-selector state is not replayed for you — reproduce it
before each capture — and indirect token or artwork dependants are not
discovered; report a missing pair as unverified rather than omitting it. The
comment text does not replace the decision/reason report.
