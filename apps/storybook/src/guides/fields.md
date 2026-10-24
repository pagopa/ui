<!-- component-rules:start -->

## Component Rules

- Keep 24px between two or more fields.
- An asterisk alone does not state that a field is required: write it in words next to the label, for example "(required)".

<!-- component-rules:end -->

## Floating labels

Text fields, text areas, the autocomplete, the selects and the date field share
one floating label. Source fields keep the label **inside** the control when
empty and unfocused (centred in short fields, top-aligned in text areas) and
float it into the **top border notch** when focused or filled. A label that
stays inset while the field is filled is a defect, not a variant.

The label is the source HUG container: one flex row that centres the label text
and the required marker on the same axis, with the generated type-scale tokens
for the resting and floated states and the source resting/floated gaps. The
floated box stays centred on the frame's top edge whatever its tallest child
measures.

A required field states its state in words: the label carries the decorative
asterisk and the visible `requiredLabel` (`"(obbligatorio)"` by default) after
it, at the caption step. The words are inside the label element, so the
accessible name reads them once; the native `required` attribute still carries
the constraint. The source drawings show the asterisk alone, so the visible
suffix is the accessibility adaptation the field rule asks for; the label keeps
its source height because the suffix steps down to the caption line box.

- Native date and time editors keep the same pattern. Their `:placeholder-shown`
  never matches, so the filled state is tracked in React, and the browser's
  empty-editor text stays hidden until focus.
- Select triggers are caller-driven: an empty select keeps the full-size label
  while open and floats it only when a value is selected.
- The autocomplete's empty live region adds no layout band above the results.

## Autocomplete

The source `Type=Default` field draws the decorative 24px `account_balance` art at
the leading edge; `leadingIcon` keeps that default and accepts a caller's node
(pass `null` to remove it). A filled enabled field shows the clear control and
the disabled filled field keeps the arrow, as the source variants draw
(`824:8863`, `824:8886`). The clear control keeps focus on the input after it
empties the field.

The announced strings are consumer-owned: `clearLabel` (`Svuota campo`),
`openLabel`/`closeLabel` (`apri lista` / `chiudi lista`), `listLabel` from the
field label (`Lista {label}`) and `selectedLabel` from the chosen value
(`hai selezionato {value}`). `loading` announces `loadingLabel`
(`Caricamento lista in corso`), marks the list busy and shows the same line in
the empty slot. A removable chip uses `Elimina {value}` by default.

## States

The source `Status` axis drives the field states: `Enabled` is the resting
control, `Active` is focus (the primary stroke and the floated label),
`Disabled` is the disabled control (the muted surface), `Success` the decorative
`check_circle` with the announced success line, and `Error` the `report` glyph
with `aria-invalid` and the destructive stroke. `Filled` is the native value —
the label floats into the notch — and `* Required` is the marker plus the words
next to the label.

## Feedback and fixtures

Errors are associated with the control and use the source `report` glyph;
success is announced as an associated description with a decorative icon.
Status icons and decorative adornments never replace native actions.

The field stories render at the source frame width so the preview matches it;
the components themselves stay `w-full` and content-driven.
