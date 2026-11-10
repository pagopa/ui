# Design request

The source leaves a question only a person can answer: one issue, one record in
`design.requests`, and a review story when visual. The issue owns the
conversation, the record preserves the answer, the node stays pending until the
answer is implemented and reviewed.

## Decide whether to ask

Read the source and the existing requests first. Ask about an unowned value, an
undrawn behaviour or state, a contradictory device composition, an API or shared
component decision, an ambiguous rule. A question the source answers becomes a
registry decision, not an issue, even when a person supplied it; one with no node
still owes its preview, captures, issue and record, but no registry pointer.

## Prepare the question

Short active sentences, one idea each, product terms and measured values;
implementation detail in collapsed context. Every issue carries one decision and
a recommendation; a new question gets its own linked issue.

For a visual question, prepare a standalone `Reviews/<slug>` story on
`design.preview.branch` tagged `['!dev', '!test', '!autodocs', 'no-visual']`,
showing at least two options side by side at 320 and 1200. One open, unmerged
review pull request owns the stable preview and its body indexes slug → issue
URL; closing it breaks the preview. Competing implementations appear as
compositions of their visual consequences, deferred until the answer; a
consequence that cannot be shown leaves the question blocked or developer-only.

Capture the deployed preview so image and link show one render:

Against `STORYBOOK_URL=<design.preview.url>`, capture each option with
`pnpm ui-cli parity render --story reviews-<slug>--option-<x> --width <w>
--viewport <w> --height 100 --screenshot <absolute-path>`.

Use 1200 for layout questions, 320 for device questions, both when relevant, with
matching widths. Keep the PNGs in `reviews-<slug>/` on the preview branch
and retain them after closure; their raw GitHub URLs must identify that branch. Inspect the live options and captures before opening the issue: URL validation
does not inspect images.

## Open

The request input follows the schema in
[design-requests.ts](../../../../packages/ui-cli/src/figma/design-requests.ts):
the authored question, context, options and recommendation, visual options
carrying existing capture URLs. It is not a second status record. For a node
request, first record `pending` and its blocker with `figma registry set`.

```sh
pnpm ui-cli figma request open --input <request-input> --dry-run --json
pnpm ui-cli figma request open --input <request-input> --json
```

Review the dry-run actions under the session's delivery permissions. The CLI
creates the labeled issue assigned to `design.owners`, writes the record, adds the
node-note pointer and, if supplied, points the rules card at it. It does not
create or deploy the story, capture the options or maintain the index.

**Done when** the issue has its owner, labels, recommendation and, when visual,
live links and an inspected capture per option and width; its record carries the
issue URL; the registry and card pointers agree; the index is updated; the node
remains pending. Reuse an open request rather than duplicating it.

## Answer and close

Sessions start on the person's request; nothing polls.
`pnpm ui-cli figma request list --waiting` (`--answered`) shows the queue. Read
the answer, implement it, update the guide and rule dispositions, and
review the node's source and render cases. Remove the review story, retaining the
captures, and update the index. With the implementation committed:

```sh
pnpm ui-cli figma request close <record> --decision "<answer>" --commit <sha> \
  --dry-run --json
```

Rerun without `--dry-run`.

The CLI records the answer, updates the labels, comments the commit link and
closes the issue. Its `openPoints` still require the story and index cleanup; it
implements nothing.

**Done when** the recorded answer is implemented and reviewed, the guide and the
ledger agree, the issue is closed with its commit link, and the cleanup complete
without deleting captures.
