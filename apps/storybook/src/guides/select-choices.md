`SelectField` and `MultiSelectField` share rich options: `label`, optional
`description`, `leading` content and a `chip`. The multiselect keeps its
array-valued selection in the named form control.

Both fields follow the source field anatomy: a decorative `account_balance`
icon is shown by default and can be replaced with `leadingIcon` or hidden with
`leadingIcon={null}`. Caller-supplied icons are inert and hidden from assistive
technology. An empty select keeps its full-size label while open; the label
floats only when a value is selected. The open state uses the source up-chevron
variant. A disabled required field keeps native required semantics but omits
the visible required marker, matching the source disabled state.

The chooser is not a menu: the popup opens right below the trigger at the
shared side offset (never overlapping the selected option), keeps the trigger's
width and is laid out in the frame it opens — no mount transition, so a
reduced-motion user sees no motion the library invented. The field itself
remains content-driven; the source frame width is used only in fidelity cases,
while the trigger keeps its accessible minimum height and shared corner token.

The floating label is the source HUG container: the label text and the required
marker share one centred flex row, and the floated box stays centred on the
frame's top edge whatever its tallest child measures.

`SelectFieldFidelity.stories.tsx` covers the source variants and retains the
existing corner, padding, gap and border tokens rather than introducing
near-match literals. The source control is a story viewport, not a runtime
width; chip widths remain content-driven instead of being forced to the sample
label.

In the multiselect, each chip's trailing control removes that option without
opening the chooser. The trigger is one button, so the control is a pointer
target, not a nested button (invalid HTML and ambiguous for assistive
technology): keyboard removal is Backspace/Delete on the trigger, and the
listbox option toggle stays available inside the popup. The selected options
render in the option order, so the removed chip is always the one under the
pointer and Backspace removes the last visible chip.

Both fields accept an optional independent `action` for a command such as
opening a location picker. It renders above the options as a real button, not a
listbox option; `disabled` and decorative `leading` content are supported. The
popup closes before `onAction` runs, so opening another overlay does not leave
competing focus scopes. The command does not select an option or submit the
surrounding form. Keyboard users can reach it from an active option with
Shift+Tab and activate it with the button's native Enter/Space behavior.

### Testing an action

A story or test that adds an `action` covers: keyboard reachability and native
Enter/Space activation; the command rendering outside the listbox (never an
option) and running only after the popup has closed; the field keeping its
values without submitting the form; and, when the command opens another overlay,
focus moving into that overlay.

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
