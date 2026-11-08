# Design request

The source leaves a question only a person can answer: one issue, one record in
`design.requests`, and a review story when visual. The issue owns the
conversation; the record preserves the answer. A node stays pending until its
answer is implemented and reviewed.

## Decide whether to ask

Read the source and existing requests first. Ask about an unowned value, an
undrawn behaviour/state, a contradictory device composition, an API/shared
component decision, or an ambiguous/conflicting rule. A question the source
answers becomes a registry decision, not an issue. A person's supplied question
gets the same source check. Questions without a node still owe their preview,
captures, issue and record, but no registry/card pointer.

## Prepare the question

Write short active sentences, one idea each, using product terms and measured
values. Put implementation detail in collapsed technical context. Every issue
has one decision and a recommendation; a newly raised question gets its own
linked issue.

For a visual question, prepare a standalone `Reviews/<slug>` story on
`design.preview.branch`, with tags
`['!dev', '!test', '!autodocs', 'no-visual']`. Show at least two plausible
options side by side at 320 and 1200. One open, unmerged review pull request
owns the stable preview for all questions; its body indexes slug → issue URL.
Closing it breaks the preview. Competing component implementations are shown as
compositions of their visual consequences, with implementation deferred until
the answer. If the consequence cannot be shown, keep it blocked or make it a
developer-only decision without a preview.

Capture the deployed preview, so the image and link show the same render:

```sh
STORYBOOK_URL=<design.preview.url> pnpm ui-cli parity render \
  --story reviews-<slug>--option-<x> --width <width> --viewport <width> --height 100 \
  --screenshot <absolute-capture-path>
```

Use 1200 for layout questions, 320 for device questions, both when relevant.
Each option has matching widths. Keep its PNGs in `reviews-<slug>/` beside
the review stories on the preview branch; retain them after closure.
Their raw GitHub URLs must identify that branch. Inspect the live options and
captures before opening the issue; URL validation does not inspect the images.

## Open

Prepare a local request input using the schema in the
[CLI implementation](../../../../packages/ui-cli/src/figma/design-requests.ts)
and the [CLI reference](../../../../packages/ui-cli/README.md#figma-workflow-commands).
The input carries the authored question, context, options and recommendation;
visual options carry existing capture URLs, not instructions to generate them.
This input is not a second status record.

For a node request, first record pending and its blocker through
`figma registry set` ([catalogue.md](catalogue.md#review-semantics)).

```sh
pnpm ui-cli figma request open --input <request-input> --dry-run --json
pnpm ui-cli figma request open --input <request-input> --json
```

Review the dry-run actions under the session's delivery permissions. The CLI
creates the labeled issue assigned to `design.owners`, writes the record,
adds the node-note pointer and, if supplied, points the rules card at it.
It does not create/deploy the review story, capture options or maintain the
review pull request index: complete those steps separately.

**Done when** the real issue has its owner, labels, recommendation and, when
visual, live links and an inspected capture per option/width; its record carries
the issue URL; the registry/card pointers agree; the preview index is updated;
and the node remains pending. Reuse an existing open request rather than
duplicating it.

## Answer and close

Sessions start on the person's request; nothing polls in the background.

```sh
pnpm ui-cli figma request list --waiting
pnpm ui-cli figma request list --answered
```

Read the issue's answer, implement it, update guide and rule dispositions, and
review the node's source/render cases. Remove the review story while retaining
captures; update the review PR index. After the authorized implementation commit:

```sh
pnpm ui-cli figma request close <record> --decision "<recorded answer>" --commit <sha> --dry-run --json
pnpm ui-cli figma request close <record> --decision "<recorded answer>" --commit <sha> --json
```

The CLI records the answer, updates labels, comments the commit link and closes
the issue. Its `openPoints` still require story/index cleanup; it does not
implement the decision or mark the node implemented.

**Done when** the recorded answer is implemented and reviewed, the guide and
ledger agree, the issue is closed with its commit link, and preview cleanup is
complete without deleting historical captures.
