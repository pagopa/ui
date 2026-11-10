# Figma delta — snapshot, triage, decisions

## Steps

1. `pnpm ui-cli figma status` and `pnpm ui-cli figma plan` name what moved.
   A plan is evidence, not a decision.
2. `pnpm ui-cli figma brief --node <nodeId>`, or `--queue` for the delta's nodes
   in dependency order. It is scoped to the delta and names what it omitted and
   truncated. Report its `implementationOrder` and both counts; a higher
   `--limit` reads more of the delta. `--refresh` when rules or comments moved
   since the pin.
3. Decide per node: implement, exclude with a reason, or leave pending with its
   request path or blocker. A judgement call the source does not answer is a
   design request, not an invention.
4. Write the catalogue: inventory, registry entry, guide, stories, exceptions.
   Statuses and what each one promises are in
   [catalogue/statuses.md](catalogue/statuses.md). A note states the residues the
   node still carries, never the history of the change.
5. Run the gates in [definition-of-done.md](definition-of-done.md). A failing gate
   is a fix, not a baseline bump: every ratchet only descends.

## What the checks own

The CLI owns the predicates — note length, device aliases and unused axes,
catalogue completeness, story evidence, rule dispositions, the token ladder,
public exports, document links, contract fingerprints — so this file states none
of them. Each error names the fix and the command: read the message instead of
remembering the rule.
