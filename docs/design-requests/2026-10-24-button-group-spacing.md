# Design request — ButtonGroup spacing: 8px rule or 24px drawing?

- Nodes: [Button](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=108-1402) (`108:1402`) and
  [BlockButtons](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=123-4498) (`123:4498`), page • Button 🟢
- Rule card: `I123:3565;52:896` ("Spazio tra più button")
- Issue: https://github.com/pagopa/ui/issues/21
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-button-group-spacing--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-button-group-spacing--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-button-group-spacing--option-c
- Status: open — the code follows the rule (8px); the drawing shows 24px and
  the parity cases record the divergence
- Decision owner: Figma design owner

## Context

The imported rule says **"Keep 8px between actions, vertically and
horizontally."** The source `BlockButtons` compositions draw **24px** between
the actions: the gap is visible in `123:4501`, `123:4504`, `123:4508`,
`2939:34214` and `2939:34947`.

`ButtonGroup` now uses `gap-2` (8px) for every child count, as the rule asks.
Before this change it used 8px only for a single child and 24px for two or
more — which matched the drawing but contradicted the rule. The parity cases
that compose the source record the 16px divergence as residues:

- `123-4498-mobile-mobile`: `2 Button group.offset.top`
- `123-4498-3-true-desktop`: `2 Button group.offset.left`
- `11133-16142-desktop-action-desktop`: `BlockButtons.box.width`
- `11133-16142-mobile-action-mobile`: block height 104 against the source 96,
  module 360 against 274

The two inner `2 Button group` fixtures keep the source 24px because they are
caller markup, not the group gap.

## The open question

Which wins?

1. **The rule (8px).** The drawing is updated to 8px in every `BlockButtons`
   variant; the current code and the new residues stand.
2. **The drawing (24px).** The rule card is corrected to 24px, the guide
   changes, and `ButtonGroup` returns to the previous conditional (8px for one
   child, 24px for more), with the old story assertions and no residues.
3. **Context-dependent.** 8px between inline actions and 24px between stacked
   blocks (or the reverse). This needs a rule that names the composition; the
   current card says "vertically and horizontally".

## Why it matters

The gap is the only difference between the rule and the source, and it is
visible in every page that composes more than one action. The guide now states
8px; if the answer is 24, the guide and the component change together.

## What is already fixed

- `ButtonGroup` has one gap for both orientations, so the answer applies to the
  component, not to each caller.
- The `StickyButtonBar` keeps its own 8px stack gap (single child) and is not
  part of this question.
