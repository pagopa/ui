---
name: figma-to-code
description: Figma alignment for React components, device variants, tokens and artwork. Use for a delta or drift handoff, a node-backed component, API coverage without a node, parity evidence, or design-owner questions.
---

# Figma to code

Figma is read-only: read it over REST or MCP where
[init.md](references/init.md#rest-or-mcp) says so; changes land in the repository.

## Sequence

1. **Scope.** `pnpm ui-cli figma status` names the config and the route: no config
   or a source comparison → [init.md](references/init.md); a live change →
   [delta.md](references/delta.md).
2. **Context.** `pnpm ui-cli figma brief --node <nodeId>`; `--queue` orders the
   delta's briefs. [Statuses](references/catalogue/statuses.md); done when target,
   guide, constraints, rules, comments and devices are read.
3. **Decide.** Automation orders and measures, never decides: implement, exclude,
   or leave pending with a request.
4. **Close.** [definition-of-done.md](references/definition-of-done.md).

## Routes

One route per session; this is the live delta:
[node review](references/node-review.md), [parity](references/visual-parity.md),
[new from a node](references/new-from-figma.md),
[without one](references/new-without-node.md),
[design request](references/design-request.md),
[devices](references/devices/vocabulary.md),
[catalogue](references/catalogue/files.md), [artwork](references/artwork.md),
[tokens](references/tokens.md), and the
[component standards](../pagopa-ui-standards/SKILL.md).
