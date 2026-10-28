# Design request — Autocomplete: what happens to the selected values that do not fit?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/76
- Status: open — the node stays `implemented`; the choice changes the overflow only
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-autocomplete-multiselect-overflow--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-autocomplete-multiselect-overflow--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-autocomplete-multiselect-overflow--option-c

Date: 28 October 2026. Origin: open point 4 of
[the multiselect request](./2026-10-22-autocomplete-multiselect.md), node
`824:8838`. Figma was not modified: the measurements below come from the pinned
inventory and the parity cases of the two filled multiselect variants.

The node stays `implemented`; this request is named in its registry note. The
implementation is
[autocomplete.tsx](../../packages/pagopa-ui/src/components/inputs/autocomplete.tsx),
the review story is
`apps/storybook/src/reviews/autocomplete-multiselect-overflow.stories.tsx` on
the review pull request (it never merges, so it is not linked as a path), and
the evidence is the two `824-8838-*` parity cases in
[parity-cases.json](../../packages/pagopa-ui/src/catalog/figma/parity-cases.json).

## Why

`Type=Multiselect` (`824:8872`) draws a row of `Input chip` pills inside the
same 272x48 frame, and `Type=Multiselect counter` (`11073:2423`) draws one
44x24 pill reading the number of values. Every variant of the set is filled with
two or three values, so the drawing never shows what happens once the values
stop fitting the frame: those two pictures are not in the source.

The two facts the measurement does give are in tension. The pills sit in a
`Label container` that is 160 wide while the frame is 272, so the source itself
gives the pills less room than the frame holds; and the source lets a fifth pill
overflow the 272 frame instead of drawing it clipped. Both say the set was never
taken to the case, not what the case should be.

## The options

**A — The row scrolls.** The pills stay on the 48 px line and the ones past the
right edge are reached by scrolling sideways. Every value keeps its own X, the
frame keeps the height the set draws everywhere, and the values beyond the edge
are invisible until the gesture. This is what ships today: the strip is
`overflow-x-auto`, and the `824-8838-two-values-selected` case already records
the scroll as an advisory `responsive.scrollable` residue — 34 px at the source
width, where two 68 px pills and the 24 px caret target do not fit the 160 px
`Label container`.

**B — The counter replaces the pills.** The field switches to the
`Type=Multiselect counter` display: one 44x24 pill with the number of values and
a X that clears them all. The frame keeps its height and nothing scrolls; the
cost is that no single value can be removed, and every value is unnamed.

**C — The field grows and the pills wrap.** The row takes the height it needs and
the pills use two lines. Every value keeps its X and stays visible; the cost is
that the field is no longer 48 px high, so it stops sharing the row height of
every other control in the form.

## What we recommend

A, the row that scrolls. It is the only option that keeps both the 48 px frame
the set draws in every variant and the X on every value, and it is the one
already implemented and parity-verified in pull request #74. The sideways
gesture is the cost; B stays available as the deliberate choice a consumer makes
by using the counter display, and C would be implemented if the design prefers
it.

## What we need

Which of the three behaviours is the intended one when the selected values do not
fit: the scrolling row, the counter, or a taller wrapping field? The answer
changes `multipleDisplay`'s default for the chips display, and nothing else.

## When

Does not block the release. The field ships with A today; the answer only changes
the overflow, so the node needs no new parity capture unless the answer is C.

## What is already fixed

- The pills display (`824:8872`) and the counter display (`11073:2423`), both
  parity-verified at the source 272x48 frame.
- `multiple: string[]` and `multipleDisplay?: "chips" | "counter"` as the public
  API, with `removeValueLabel` and `clearAllLabel`.
- The 272x48 frame, the floated label, the trailing `[clear][chevron]` group and
  Backspace on the last value.
