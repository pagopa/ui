# ADR-0009 — Routine design defaults are ratified once, as policy

- **Status:** Accepted — 2026-11-26.
- **Date:** 2026-11-26
- **Context:** the design-request queue had grown to 27 records, most of them
  asking the same three questions in a per-component shape: which colour a state
  surface uses when the library publishes no variable for that exact need, how a
  control that puts an icon next to text is measured, and when a layout may
  switch. Each answer needed a decision-owner round trip, so drift stalled on
  questions that had a derivable answer.
- **Related:** [the ratified defaults](../design-defaults.md) — the authority
  this ADR establishes; [ADR-0004](./0004-device-axis.md) — the device
  vocabulary §4.1 reads; [ADR-0002](./0002-deferred-decisions.md) — the deferral
  register the derivation widens; [the request
  flow](../../.agents/skills/figma-to-code/references/design-request.md).

## 1. Problem

A design request is the right instrument for a choice only the design owner can
make: a new hue, a new piece of artwork, a geometry the frames do not carry. It
was also being used for choices that follow from what the library already
publishes.

- **State colours were re-decided per component.** `success`, `warning`, `info`,
  `error` and `destructive` already publish four roles each (solid, soft,
  border, text) plus local hover and pressed steps
  (`--destructive-hover`, `--primary-active`). A component that needed the fifth
  use of the same family asked instead of mapping to the role.
- **Composite spacing was re-measured per component.** The recurring
  icon-plus-text geometry is always the same composition (padding + icon + gap),
  so `44 px` in a text field is `12 + 24 + 8`, not a value to be negotiated.
- **Responsive behaviour was re-asked per family.** The device scale, the two
  container values and the WCAG conditions the accessibility contract already
  enforces at 320 px are one policy, not thirty-four decisions.

The consequence was a queue that grew faster than it drained: #45 alone lists 34
component families asking the same reflow question, and #46 asks for a spacing
and breakpoint confirmation the tokens already answer.

## 2. Decision

The three families are ratified as **written policy** in
[`docs/design-defaults.md`](../design-defaults.md), which becomes the authority
an alignment cites:

1. **Derived state colours** — a documented algorithm over the base status token
   (four roles, `color-mix` for a missing step, opaque surfaces), verified for AA
   contrast. Not per-component hex values.
2. **Composite input-plus-icon spacing** — a published scale covering the
   recurring values, with the composition rule that produces a control's total
   from its parts, generated as tokens.
3. **Responsive layout rules** — derived from the existing breakpoint and
   container-query tokens plus the WCAG 1.4.10 / 1.4.12 / 1.4.4 contract the
   accessibility suite already runs.

The defaults are derived **read-only** from the library: ratification wrote
nothing to Figma. An alignment consults them before opening a request, and opens
a request only for what they do not cover.

The queue follows: a per-component request that the defaults answer is closed
with a pointer to the policy, and the part it does not answer is re-scoped into a
narrower request. #45 (reflow conditions) and #46 (foundation variables) are the
two the ratification makes answerable by reference.

## 3. Consequences

- **Alignments proceed without a round trip** for state colours, composite
  spacing and layout switches; the policy is cited in the alignment's notes.
- **The queue drains.** Open records are re-scoped to their unanswered part, so
  the decision owner is asked only what needs a new choice.
- **The policy is checked, not remembered.** `docs/design-defaults.md` and the
  pointers to it from the request flow are read by
  `packages/ui-cli/tests/records/design-defaults.test.mjs`, so the document
  cannot disappear while the skills still cite it.
- **The reflow exemption stays debt.** `a11yContract: { reflow: false }` is not
  a ratified exception: the flag is removed as each family is fixed.
- **No new Figma variable is implied.** Ratifying a derived colour or a
  composition does not publish it upstream; a future publication stays a
  separate decision under ADR-0002.

## 4. Deferred decisions with triggers

- **Publishing the defaults as Figma variables.** Trigger: the design owner
  decides the library should carry the composite and status roles as variables.
  Until then the tokens stay local extensions with their source.
- **A z-index scale, a radius scale and a dimension scale.** These were asked in
  #46 and are **not** answered by the defaults; they stay open in the re-scoped
  request.
