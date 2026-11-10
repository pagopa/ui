# Figma delta — snapshot, triage, decisions

## Steps

1. `pnpm ui-cli figma status` and `pnpm ui-cli figma plan` name what moved.
   A plan is evidence, not a decision.
2. `pnpm ui-cli figma brief --node <nodeId>`, or `--queue` for the delta's nodes
   in dependency order. It is scoped to the delta and names what it omitted and
   truncated. Report its `implementationOrder` and both counts, an omitted
   node staying unread; a higher `--limit` reads more of the delta. `--refresh`
   when rules or comments moved since the pin.
3. Decide per node, dependents too: implement, exclude with a reason, or leave
   pending, naming the design-request file it waits on or its blocker. A
   judgement call the source does not answer is a design request, not an
   invention.
4. Write the catalogue: inventory, registry entry, guide, stories, exceptions.
   Statuses and what each one promises are in
   [catalogue/statuses.md](catalogue/statuses.md). A note states the node's
   residues, never the change's history.
5. Run the gates in [definition-of-done.md](definition-of-done.md). A failing gate
   is a fix, not a baseline bump: every ratchet only descends.

## What the checks own

The CLI owns the predicates — note length, device axes, catalogue completeness,
story evidence, rule dispositions, the token ladder, exports, document links,
fingerprints — so this file states none. Each error names its fix and the
command: read the message instead of remembering the rule.
