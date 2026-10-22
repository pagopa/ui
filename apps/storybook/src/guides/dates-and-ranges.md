`DatePicker` is the source calendar panel and `DatePickerField` is the field
that opens it: the custom chooser replaces the browser's native picker. The
calendar owns a draft, not the application's committed value. `onConfirm` runs
only after **Salva** with a complete selection; **Annulla** discards the draft
and calls the required `onCancel`. External value changes discard stale drafts
and validation without stealing focus.

The panel stacks its four blocks with the source's 8px gap: the `Header` — the
label `Row` (14/20, 16/8 insets) over the month `Row` (18/26 Semibold with the
24px chevrons, 8/16 insets) — closed by its full-bleed `Divider`, then the
`Calendar`, a `Divider` and the footer `Row` whose actions keep the source's
16px inline inset. The day cells and the footer buttons keep pointer-sized
targets, so the panel is taller than the source's 426px sample.

Single selection uses `value?: Date` and `onConfirm: (value: Date) => void`.
`mode="range"` uses `value?: DatePickerRange` and
`onConfirm: (value: DatePickerRange) => void`, where both `from` and `to` are
required. An incomplete range announces an associated error and focuses the
active date; selecting the same date twice forms a valid one-day range.
Month controls, arrow keys, Home/End and PageUp/PageDown use React DayPicker's
native focus behavior, with one date in the tab order.

`DatePickerField` keeps the native field contract: its value is a local ISO
date (`YYYY-MM-DD`, never a UTC instant), it renders the it-IT calendar format
(11 mag 2026), and a named form control carries the value so native submission,
reset and `required` validation keep working. The trigger is a labelled button
that opens the panel right below the field; the floating label rests centred
while the field is empty and unfocused, and takes the source notch while it has
a value or is focused (the click that opens the panel). `readOnly` keeps the
committed value without a popup trigger, `today` moves the calendar's reference
day, and `onValueChange` reports the committed local ISO date.

The application owns any surrounding overlay beyond the field. The calendar
does not create hidden form values or submit a form when selecting, saving or
cancelling. The panel is wider than the source's to provide accessible date
targets, opens without a mount transition (so it is laid out in its own frame and
reduced motion is not invented), and it shrinks in nested grids while keeping at least a pointer-sized
target; circles shrink proportionally when necessary, and text can wrap.
Gregorian weekdays are calculated correctly rather than copying the source's
misplaced illustrative May 2026 dates. Headers use Italian date order, and
forced colors retain selected circles and range bands with the user's system
Highlight/HighlightText palette. These adaptations and the bundled font are not
a pixel-identical claim.
