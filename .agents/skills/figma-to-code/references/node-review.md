# Review of an existing node

For a node already in `catalog.inventory`: a drift pull request node that is
`pending` again, a historical `implemented` entry the person asks to re-review,
or a code-side fix or refactor of a mapped component. One node at a time; never a
bulk re-approval.

## Steps

1. **Read the record.** The node's registry entry (status, target, `note`), its
   committed cases (`pnpm nx run pagopa-ui-cli:figma:parity:queue --node <id>`), and the guide of the
   target component. The note's constraints and open decisions are binding until
   the review changes them.
   **Done when** the current target, its stories and the recorded adaptations are
   written down.

2. **Read what changed.** For a drift node: its class (`changed`, `affected`,
   `renamed`, `moved`) and changed devices from the pull request body or
   `--plan`; an `affected` node changes because a dependency did. For a
   historical node: the whole source, every declared device. For a code-side
   change: the source the change touches.
   **Done when** the source variants to compare are listed.

3. **Re-run the evidence.** `pnpm nx run pagopa-ui-cli:figma:parity:check --case <caseId>` per
   committed case, `--node <id> --devices` for a device axis; capture the cases
   that are missing ([visual-parity.md](visual-parity.md)). A residue measured
   under conditions that no longer hold (an old font, a removed dependency) is
   re-measured, never re-approved.
   **Done when** every case reports a verdict.

4. **Decide** exactly one:
   - still matches → `implemented`;
   - must change → fix the component and its story in the same pull request,
     re-run the cases, then `implemented`;
   - out of scope → `excluded` with a reason;
   - cannot be closed now → stays `pending`, with the blocking condition in the
     note.

   A `mocked` demo keeps its status and note: a review is not a renewal. A
   mapping to an existing implementation needs that implementation to cover the
   node's whole contract, every device included.
   **Done when** the registry entry reflects the decision and its note states any
   constraint or open point in itself, without pointing elsewhere.

5. **Close** with `pnpm nx run pagopa-ui:figma:check`, the source-alignment checklist in
   [definition-of-done.md](definition-of-done.md) when code changed, and the
   closing steps of the skill.
