---
name: figma-to-code
description: Figma alignment for React components, device variants, tokens and artwork. Use for a Figma delta or drift handoff; creating or reviewing a node-backed component; public API coverage without a node; source/render parity or missing catalogue evidence; design-owner questions and their answers.
---

# Figma to code

Align the repository with the published Figma library. Figma is read-only:
use REST GETs and MCP read tools; changes and decisions land in the repository.
Project paths, identities, devices and decisions come from the config and CLI,
not this skill. Run interactive commands from the workspace root as
`pnpm ui-cli …`; discover flags with the command's `--help`.

## Sequence

1. **Scope.** Run `pnpm ui-cli figma status`; read the config it identifies.
   Missing config or a source-comparison session → [init.md](references/init.md).
   For a live change, follow [delta.md](references/delta.md); for a drift pull
   request, [handoff.md](references/handoff.md).
   **Done when** the source route, freshness and requested node scope are known.
2. **Context.** Read `pnpm ui-cli figma brief --node <nodeId>` before touching
   a node; `--queue` batches the delta's briefs in implementation order, names
   what it omitted and caps its own length (`--full` for the whole queue).
   Use `--refresh` when rules/comments versions may differ from the pin
   ([rules.md](references/rules.md)). Census every touched page
   ([catalogue.md](references/catalogue.md#the-page-surface)).
   **Done when** each node's target, guide, constraints, rules, comments,
   requests and declared devices have been read, and each touched page's
   identities and compositions are accounted for.
3. **Decide and align.** Take the matching branch below. For render work,
   `pnpm ui-cli parity align --node <id>` supplies the per-device commands;
   inspect each source variant and its rendered story, then save reviewed cases.
   Automation orders and measures the work; it does not make the node decision,
   inspect images or answer a design question.
   **Done when** every scoped node has a reasoned decision: reviewed
   implementation, exclusion, or pending with its request/blocker named.
   Historical nodes are reviewed only on request; mocked demos are not renewed.
4. **Close.** Apply [definition-of-done.md](references/definition-of-done.md):
   source alignment, automated gates, full green chain, delivery permission
   stop and report. Missing evidence or an unavailable browser remains unverified.

## Branches

| Work | Read |
| --- | --- |
| New implementation from a node | [new-from-figma.md](references/new-from-figma.md) |
| Existing node: drift, mapping, fix or re-review | [node-review.md](references/node-review.md) |
| Public component without a node | [new-without-node.md](references/new-without-node.md) |
| Parity wave or visual fix | [visual-parity.md](references/visual-parity.md) |
| Device axis or responsive scope | [devices.md](references/devices.md) |
| Token change or off-token value | [tokens.md](references/tokens.md) |
| Icons or pictograms | [artwork.md](references/artwork.md) |
| Unanswered source question or recorded answer | [design-request.md](references/design-request.md) |
| New/revised source name or prop | [prop-conventions.md](references/prop-conventions.md) |

Shared contracts: [catalogue.md](references/catalogue.md) for ownership and
decisions; [parity-tooling.md](references/parity-tooling.md) for evidence and
case mapping; [rules.md](references/rules.md) for rule dispositions and comments.
