# Review of an existing node

For a node already in `catalog.inventory`: a drift pull request node that is
`pending` again, a historical `implemented` entry the person asks to re-review,
or a code-side fix or refactor of a mapped component. One node at a time; never a
bulk re-approval.

## Steps

1. **Read the record.** `pnpm ui-cli figma brief --node <nodeId>`
   gathers the registry entry (status, target, `note`), the rules that target the
   node, the open comments and the design requests ([rules.md](rules.md)). Read
   its committed case IDs
   (`pnpm ui-cli parity capture --saved --node <id> --dry-run`),
   their entries in `catalog.parityCases`, and the guide of the target component
   too. The note's constraints and open decisions are binding until the review
   changes them.
   **Done when** the current target, stories, adaptations and outstanding
   rule/comment work are known.

2. **Read what changed.** For a drift node: its class (`changed`, `affected`,
   `renamed`, `moved`) and changed devices from the handoff brief or
   `figma plan`; an `affected` node changes because a dependency did. For a
   historical node: the whole source, every declared device. For a code-side
   change: the source the change touches.
   **Done when** the source variants to compare are listed.

3. **Re-run the evidence.** `pnpm ui-cli parity check --node <id> --saved`
   runs every committed case and checks declared-device coverage. Capture missing cases
   ([visual-parity.md](visual-parity.md)). A residue measured under conditions
   that no longer hold (an old font, a removed dependency) is re-measured, never
   re-approved.
   **Done when** every case reports a verdict.

4. **Decide** using [catalogue review semantics](catalogue.md#review-semantics).
   Record the result with `pnpm ui-cli figma registry set <id> --status <status>`
   and its evidence/reason flags. A design-owner blocker uses
   [design-request.md](design-request.md).

   A `mocked` demo keeps its status and note: a review is not a renewal. A
   mapping to an existing implementation needs that implementation to cover the
   node's whole contract, every device included. A changed rule updates the
   guide and its ledger entry in the same pull request
   ([rules.md](rules.md)).
   **Done when** the registry entry reflects the decision; a constraint or
   residue is in the note, and an open question names its design request.

5. **Close** with [source alignment and delivery](definition-of-done.md),
   including reviews that need no code change.
