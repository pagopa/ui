---
name: figma-to-code
description: Figma alignment for React components, device variants, tokens and artwork. Use for a delta or drift handoff, a node-backed component, API coverage without a node, a parity comparison, or design-owner questions.
---

# Figma to code

Figma is read-only: read it over REST or MCP where
[init.md](references/init.md#rest-or-mcp) says so; changes land in the repository.

## Sequence

1. **Scope.** `pnpm ui-cli figma status` names the config and the route: no config
   or a source comparison → [init.md](references/init.md); a live change →
   [delta.md](references/delta.md).
2. **Context.** `pnpm ui-cli figma brief --node <nodeId> --card` reads the
   bounded node card: target, guide pointer, constraints, rules, comments and
   devices. `--queue` orders the delta's briefs the same way; drop `--card` for
   the whole brief when the card's pointer leaves a question open.
   [Statuses](references/catalogue/statuses.md); done when those are read.
3. **Align.** `pnpm ui-cli align <nodeId>`: the preflight, the capture and the
   comparison in one run, writing nothing. Done when every declared device has a
   run whose result you can restate ([commands](references/commands.md)).
4. **Decide.** Automation orders and measures, never decides: implement, exclude,
   or leave pending with a request. The ratified design defaults
   (`design-defaults.md`) answer the routine choices — a derived state colour, a
   composite input-plus-icon spacing, a layout switch, a reflow condition —
   before a request is opened.
5. **Close.** `pnpm ui-cli record <nodeId> --status …` writes the decision and its
   documents in one atomic run; then
   [definition-of-done.md](references/definition-of-done.md): every decision,
   every read's scope, every gate's exit code.

## Routes

One route per session; this is the live delta:
[node review](references/node-review.md),
[the two commands](references/commands.md),
[parity](references/visual-parity.md),
[new from a node](references/new-from-figma.md),
[without one](references/new-without-node.md),
[design request](references/design-request.md),
[devices](references/devices/vocabulary.md),
[catalogue](references/catalogue/files.md), [artwork](references/artwork.md),
[tokens](references/tokens.md), and the
[component standards](../pagopa-ui-standards/SKILL.md).
