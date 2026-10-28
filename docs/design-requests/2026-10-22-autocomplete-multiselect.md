# Design request — Autocomplete: does the field own the source `Type=Multiselect`, or is it another component?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/40
- Status: answered 12 November 2026 — Option A, the node stays `pending` until its parity capture
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-autocomplete-multiselect--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-autocomplete-multiselect--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-autocomplete-multiselect--option-c

Date: 22 October 2026. Origin: flow A/E, milestone M5
([figma-fidelity-and-drift.md](../plans/figma-fidelity-and-drift.md)), node
`824:8838`. Figma was not modified: the measurements below come from the pinned
inventory, the registry note and the current code.

The node stays `pending`; this request is named in its registry note. The
decision below is written in
[issue #40](https://github.com/pagopa/ui/issues/40#issuecomment-6471855771). The
implementation is
[autocomplete.tsx](../../packages/pagopa-ui/src/components/inputs/autocomplete.tsx),
the second implementation considered is
[multi-select-field.tsx](../../packages/pagopa-ui/src/components/inputs/multi-select-field.tsx)
and the story is
[Autocomplete.stories.tsx](../../apps/storybook/src/Autocomplete.stories.tsx).

## Why

The source set declares three `Type` values: `Default`, `Multiselect` and
`Multiselect counter`. `Default` is a single-value search field: it draws the
resting label inside the control, a `close_small` clear glyph when filled, and a
`keyboard_arrow_down` chevron when empty. The two multiselect types draw a row of
`Input chip` pills inside the same field frame, the `account_balance` leading
art and a `keyboard_arrow_down` chevron — a chooser, not a search field.

The `Autocomplete` component is single-value (`value?: string`, no `multiple`),
so it cannot render the two multiselect types. The library already has that
composition: `MultiSelectField` is "a trigger [that] renders a removable chip per
selection", with the same `account_balance` 24px leading art, and the
`SelectField` node (`602:9417`) already declares it as an `additionalTarget`.

## Evidence

| Source variant                       | Node         | Box    | The library today              |
| ------------------------------------ | ------------ | ------ | ------------------------------ |
| `Type=Default` (4 statuses × filled) | `824:8839`…  | 272x48 | `Autocomplete`, single value   |
| `Type=Multiselect`, filled           | `824:8872`   | 272x48 | not rendered by `Autocomplete` |
| `Type=Multiselect counter`, filled   | `11073:2336` | 272x48 | not rendered by `Autocomplete` |
| `Type=Error`                         | `824:8919`   | 274x71 | `Autocomplete` with `error`    |

The `Default` type is implemented and would be reviewable on its own; the
multiselect types are what keep the node out of `implemented`.

## The open question

- Does the `Autocomplete` component own the two multiselect types, or do they
  belong to the multi-select field composition?
- If the component owns them, the field gains a multiple-selection API: is the
  value a list of chips, and does the search input stay editable next to them?
- `Multiselect counter`: what does the counter count (the selected chips beyond
  the visible row? the matching options?) and where is it drawn?
- Is the `Type=Multiselect` field a chooser (chevron, no free text) or a search
  with chips? The pinned variant draws the chevron and no clear glyph.

## Evidence added 28 October 2026

The drift delta of 28 October touched exactly the seven variants of the two
multiselect types, and no `Type=Default` or `Type=Error` variant:
`824:8872` and `824:8904` (`Required=True`), `10276:53843` and `10276:53877`
(`Required=False`), `11073:2336` and `11073:2286` (`Multiselect counter`). The
pinned snapshot is a slice of top-level nodes, so it does not hold these
variants; the shapes below come from the live Figma MCP, read variant by
variant.

- Every box stays 272x48, the insets stay 12, the chips stay 68 wide and 24
  tall: nothing about the field frame changed.
- The chips row gained a `Cursor`: an 8x24 frame holding a 1px
  `rounded-rectangle`, drawn after the last visible chip in `824:8904` and
  `10276:53877`. The multiselect type therefore keeps a typed value next to the
  chips, and the first open question below is answered by the drawing: it is a
  search with chips, not a chevron-only chooser.
- The trailing glyph changed. The `Multiselect` variants now draw a 48x24
  `Action goup` at x=200 holding **two** 24px
  `primitive/input/select/default arrow` instances, side by side at x=0 and
  x=24. The `Multiselect counter` variants draw a 24x24 `Action goup` with
  **one** arrow. A `Default` field draws one 24px trailing glyph.
- The layer name is `Action goup`, and the second arrow is drawn by no rule and
  named by no card.

This leaves the request open and adds one part to it: the multiselect type now
declares a second 24px trailing action that the counter type does not, and the
field is 248 wide with the chips row taking 160 of it, so the two arrows share
the space a single glyph used to own. What the second arrow does (clear all
chips? open the list?) and why the counter type keeps one are not in the
drawing.

## Why it matters

The node cannot reach `implemented` while a declared type has no implementation
("a mapping to an existing implementation needs that implementation to cover the
node's whole contract"). Guessing would either add a public API the design never
asked for or silently drop two source types. The answer decides the registry
shape: one node with `additionalTargets` (as `602:9417` does today), a separate
node for the multiselect composition, or an exclusion with a reason.

## Options

1. **`Autocomplete` gains the multiselect API** (one component, a list value and
   chips). Highest cost, one public API, the two types share the field frame.
2. **The multiselect types map to `MultiSelectField`** through
   `target.additionalTargets` on `824:8838`, as `602:9417` already does. No new
   API; the node's contract spans two components; the counter still needs an
   answer.
3. **The multiselect types are excluded with a reason** (they belong to a
   chooser node that is not this one), and the node closes on its `Default`
   type.

A recommendation is an option, not a decision.

## What is already fixed

- The `Default` type: 272x48 field, radius 8, the 1px `#636b82` stroke
  (primary when active, `#d13333` on error), the 12px insets, the resting
  16/22 `#555c70` label inside the control, the floated 12/18 notch label, the
  24px `account_balance` leading art and the 24px trailing glyph.
- The shared field contract (`FieldStateProps`): label, description, error,
  success, required, disabled; the tokens come from the design foundations.
- The multiselect composition exists as `MultiSelectField` and is already
  reviewed under `602:9417`; nothing here re-opens that mapping.

## Decision

**Option A.** `Autocomplete` owns the two multiselect types: the field gains a
`multiple` prop whose value is a list of strings, and the search input stays
editable next to the chips. `MultiSelectField` keeps its own contract — a
non-searchable chooser whose trigger renders the chips and whose popup is the
list — and is not the target of this node.

The rules card _BEHAVIOR & ACCESSIBILITY / Multiselect counter_ closes the four
questions the drawing left open:

| Question                            | Answer from the card                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chooser or search with chips?       | Search with chips: the card draws the text cursor after the last chip, and filtering continues while chips are present.                                                                          |
| What does the counter count?        | The selected values, not the matching options: the badge reads `2` and `3` next to the chips it replaces.                                                                                        |
| Where is the badge drawn?           | At the trailing edge of the chips row, before the chevron, from two values on. A single value keeps its full name, so the count is never `1`.                                                    |
| What is the second trailing action? | Clear. The `48x24 Action goup` of the `Multiselect` variants is `[clear][chevron]`; the `24x24` group of `Multiselect counter` is the chevron alone because the badge carries the clear control. |
| How is one value removed?           | Each pill carries its own `close` in the `Type=Multiselect` variants, and the count badge carries one in `Type=Multiselect counter`.                                                                |

The field therefore maps as follows: `Type=Default` is single value
(`multiple` absent, `value?: string`); `Type=Multiselect` and
`Type=Multiselect counter` are both `multiple` (`value?: string[]`), and
`multipleDisplay` (`"chips"`, the default, or `"counter"`) chooses between the
two renderings. The chevron points up while the list is open, as the card draws
it, and clearing the last value resets the field to its resting label.

### What the implementation does

- `multiple` is a discriminated prop: `multiple?: false` keeps `value?: string`
  and `onValueChange?: (value: string) => void`; `multiple: true` takes
  `value?: string[]` and `onValueChange?: (value: string[]) => void`.
- `multipleDisplay: "chips"` (`Type=Multiselect`) renders one `InputChip` per
  value, each with its own remove control read as `removeValueLabel`
  (`Elimina {value}`), the source's per-pill `close`.
- `multipleDisplay: "counter"` (`Type=Multiselect counter`) keeps one value as
  its full-label pill and, from two values, collapses the row into a count
  badge whose visible count is `aria-hidden` and whose screen-reader sentence
  comes from `counterLabel`. The badge owns the clear action
  (`clearAllLabel`, `Svuota tutti i valori`), so the trailing group is
  `[clear][chevron]` at one value and `[chevron]` from two.
- The input keeps filtering with chips present and the cursor sits after the
  last chip; `Backspace` on an empty input removes the last value beside the
  pills' own controls.
- A `selectAllLabel` adds the list's first row, which selects or clears every
  enabled option.

### The two types in the source

A live read of the filled variants confirms the split the card draws.
`824:8872` (`Type=Multiselect`) holds two 68x24 `Input chip` pills side by side,
each one carrying its own `close` icon container, and a 48x24 `Action goup`
`[clear][chevron]`. `11073:2423` (`Type=Multiselect counter`) holds one 44x24
`Input chip` reading `4` with its own `close`, no pill per value, the resting
label drawn inside the control, and a 24x24 group with the chevron alone. The
field frame is the same in both: 272x48, radius 8, 1px `#636b82` stroke, 12px
insets; the pill is radius 100, `#e8ebf1`, `Titillio-Semibold` 12/18
`#0e0f13`, and its remove glyph is a 24px target holding a 9x9 `close_small` in
`#0b3ee3`.

### Open points, left to the design owner

1. The card's open state draws the chevron pointing up and names the control
   "Chiudi il menu", a label that describes the action rather than the control;
   the implementation follows both. Confirm the wording is intended next to the
   state glyph.
2. The card keeps the label drawn inside the control at two or more values and
   floats it at one; the implementation floats it whenever the field holds a
   value or has focus, because a chips row is not the notch the label folds
   into. Confirm which of the two the set means.
3. ~~Removing one value of several has no visible per-chip control.~~ Answered
   by the source: every pill carries its own `close`, and the implementation
   follows it through `removeValueLabel`.
4. A chip carries its full label and the field is 272 wide, so a long label is
   truncated by the frame rather than inside the chip. The pills now sit in a
   one-line strip that scrolls once the pills and the caret target stop fitting
   the 160px `Label container` — the source instead lets five pills overflow the
   272 frame. Confirm the scroll is the behaviour the design wants for many
   values, or whether `Type=Multiselect counter` is the only intended display
   once the row stops fitting.
5. The `Type=Multiselect` variants also draw a `Cursor` frame, the 8x24 frame
   with a 1px rule after the last pill; the implementation leaves the real text
   caret there instead. Confirm the drawn cursor is the editable input's caret
   and not a separate decoration.
