---
name: figma-to-code
description: Figma alignment for React components, device variants, tokens and artwork. Use for a delta or drift handoff, a node-backed component, API coverage without a node, parity evidence, or design-owner questions.
---

# Figma to code

Align the repository with the published Figma library. Figma is read-only: read
it through the CLI over REST, or on MCP where [init.md](references/init.md#rest-or-mcp)
says so; changes land in the repository.

## Sequence

1. **Scope.** `pnpm ui-cli figma status` names the config and the route: missing
   config or a source comparison → [init.md](references/init.md); a live change →
   [delta.md](references/delta.md).
2. **Context.** `pnpm ui-cli figma brief --node <nodeId>` before touching a node;
   `--queue` orders the delta's briefs and caps its length. Statuses:
   [catalogue/statuses.md](references/catalogue/statuses.md). Done when each
   node's target, guide, constraints, rules, comments and devices are read.
3. **Decide.** Automation orders and measures; it does not decide. A node gets a
   reviewed implementation, an exclusion, or a pending request in the ledger.
4. **Close.** [definition-of-done.md](references/definition-of-done.md).

## Routes

One route per session; this is the live-delta one and links no other. The others
start at `references/node-review.md`, `visual-parity.md`, `rules.md`,
`new-from-figma.md`, and `pagopa-ui-standards` (component quality).
