# Design request — Autocomplete: does the field own the source `Type=Multiselect`, or is it another component?

Date: 22 October 2026. Origin: flow A/E, milestone M5
([figma-fidelity-and-drift.md](../plans/figma-fidelity-and-drift.md)), node
`824:8838`. Figma was not modified: the measurements below come from the pinned
inventory, the registry note and the current code.

The node stays `pending`; this request is named in its registry note. The
implementation is
[autocomplete.tsx](../../packages/pagopa-ui/src/components/inputs/autocomplete.tsx),
the candidate second implementation is
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

| Source variant                       | Node        | Box    | The library today                          |
| ------------------------------------ | ----------- | ------ | ------------------------------------------ |
| `Type=Default` (4 statuses × filled) | `824:8839`… | 272x48 | `Autocomplete`, single value               |
| `Type=Multiselect`, filled           | `824:8872`  | 272x48 | not rendered by `Autocomplete`             |
| `Type=Multiselect counter`, filled   | `11073:2336`| 272x48 | not rendered by `Autocomplete`             |
| `Type=Error`                         | `824:8919`  | 274x71 | `Autocomplete` with `error`                |

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
