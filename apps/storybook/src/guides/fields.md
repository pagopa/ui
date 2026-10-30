<!-- component-rules:start -->

## Component Rules

- Keep 24px between two or more fields.
- An asterisk alone does not state that a field is required: write it in words next to the label, for example "(required)".

<!-- component-rules:end -->

## Floating labels

Text fields, text areas, the autocomplete, the selects and the date field share one
floating label. Fields keep the label inside the control when empty and unfocused
(centred in short fields, top-aligned in text areas) and float it into the top
border notch when focused or filled. A label that stays inset while the field is
filled is a defect, not a variant.

A required field states its state in words: the label carries the decorative
asterisk and the visible `requiredLabel` (`"(obbligatorio)"` by default) after it, at
the caption step. The words sit inside the label element, so the accessible name
reads them once, and the native `required` attribute still carries the constraint.

- Native date and time editors keep the same pattern. Their `:placeholder-shown`
  never matches, so the filled state is tracked in React, and the browser's
  empty-editor text stays hidden until focus.
- Select triggers are caller-driven: an empty select keeps the full-size label while
  open and floats it only when a value is selected.
- The autocomplete's empty live region adds no layout band above the results.

## Autocomplete

`leadingIcon` keeps the default decorative `account_balance` artwork and accepts a
caller's node (pass `null` to remove it). A filled enabled field shows the clear
control and a disabled filled field keeps the arrow. The clear control keeps focus on
the input after it empties the field.

The announced strings are consumer-owned: `clearLabel` (`Svuota campo`),
`openLabel`/`closeLabel` (`apri lista` / `chiudi lista`), `listLabel` from the field
label (`Lista {label}`) and `selectedLabel` from the chosen value
(`hai selezionato {value}`). `loading` announces `loadingLabel`
(`Caricamento lista in corso`), marks the list busy and shows the same line in the
empty slot.

`multiple` turns the value into a list and `multipleDisplay` selects between the two
multiselect displays. `chips` (the default) renders one pill per value, each with its
own remove control named by `removeValueLabel` (`Elimina {value}`). `counter` keeps a
single value as a full-name pill and collapses the pills into a count badge from two
values. The badge counts the selected values, keeps its visible count `aria-hidden`
and reads `counterLabel` (`{count} selezionati`) to a screen reader. The search input
stays editable next to the chips and the cursor sits after the last chip, so filtering
continues with chips present.

The trailing group holds the clear control and the chevron wherever a value is held;
the one exception is the collapsed badge, which carries `clearAllLabel`
(`Svuota tutti i valori`) itself and leaves the chevron alone. A single value is never
a count of `1`, so `counter` keeps its full label until the second value arrives.
`Backspace` on an empty input removes the last value, the native combobox path next to
each pill's own control. `selectAllLabel` adds the list's first row, which selects
every enabled option or clears the selection.

The pills sit in a one-line strip after the leading icon: when the pills and the caret
target no longer fit, the strip scrolls instead of wrapping, so the field keeps its
height and no value is lost. `counter` is the display to use once the values stop
fitting.

## States

`Enabled` is the resting control, `Active` is focus (the primary stroke and the
floated label), `Disabled` is the disabled control (the muted surface), `Success` is
the decorative `check_circle` with the announced success line, and `Error` carries the
`report` glyph, `aria-invalid` and the destructive stroke. `Filled` is the native
value, with the label floated into the notch; `* Required` is the marker plus the
words next to the label.

Errors are associated with the control and use the `report` glyph; success is
announced as an associated description with a decorative icon. Status icons and
decorative adornments never replace native actions.

The components are `w-full` and content-driven.
