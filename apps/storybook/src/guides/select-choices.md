<!-- component-rules:start -->

## Component Rules

- Keep 24px between two or more fields, selects included.

<!-- component-rules:end -->

`SelectField` and `MultiSelectField` share rich options: `label`, optional
`description`, `leading` content and a `chip`. The multiselect keeps its
array-valued selection in the named form control.

Both fields show a decorative `account_balance` icon by default; replace it with
`leadingIcon` or hide it with `leadingIcon={null}`. Caller-supplied icons are inert
and hidden from assistive technology. An empty select keeps its full-size label
while open, and the label floats only when a value is selected. A disabled required
field keeps native required semantics but omits the visible required marker,
matching the source disabled state.

The chooser is not a menu: the popup opens right below the trigger at the shared
side offset (never overlapping the selected option), keeps the trigger's width and
is laid out in the frame it opens, with no mount transition, so a reduced-motion
user sees no invented motion. The trigger stays content-driven and keeps its
accessible minimum height and shared corner token.

In the multiselect, each chip's trailing control removes that option without
opening the chooser. The trigger is one button, so the control is a pointer target,
not a nested button (invalid HTML and ambiguous for assistive technology): keyboard
removal is Backspace/Delete on the trigger, and the listbox option toggle stays
available inside the popup. The selected options render in the option order, so the
removed chip is always the one under the pointer and Backspace removes the last
visible chip.

Both fields accept an optional independent `action` for a command such as opening a
location picker. It renders above the options as a real button, not a listbox
option, and supports `disabled` and decorative `leading` content. The popup closes
before `onAction` runs, so opening another overlay does not leave competing focus
scopes. The command does not select an option or submit the surrounding form.
Keyboard users reach it from an active option with Shift+Tab and activate it with
the button's native Enter/Space behaviour.

## Example

```tsx
<MultiSelectField
  label="Comuni"
  name="cities"
  defaultValue={["roma"]}
  options={[
    { value: "roma", label: "Roma", description: "Comune selezionato." },
    { value: "milano", label: "Milano", description: "Comune disponibile." },
  ]}
  action={{
    label: "Usa la posizione attuale",
    onAction: openLocationPicker,
  }}
/>
```
