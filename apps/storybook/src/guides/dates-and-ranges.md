`DatePicker` is the source calendar panel and `DatePickerField` is the field that
opens it: the custom chooser replaces the browser's native picker. The calendar
owns a draft, not the application's committed value. `onConfirm` runs only after
**Salva** with a complete selection; **Annulla** discards the draft and calls the
required `onCancel`. External value changes discard stale drafts and validation
without stealing focus.

The panel stacks its header, the calendar, a divider and the footer actions. The
day rows keep the pointer target the accessibility contract requires, so the panel
can be taller than the source sample, and the footer actions are text actions
whose target sits on an invisible expansion.

Single selection uses `value?: Date` and `onConfirm: (value: Date) => void`.
`mode="range"` uses `value?: DatePickerRange` and
`onConfirm: (value: DatePickerRange) => void`, where both `from` and `to` are
required. An incomplete range announces an associated error and focuses the active
date; selecting the same date twice forms a valid one-day range. Month controls,
arrow keys, Home/End and PageUp/PageDown use React DayPicker's native focus
behaviour, with one date in the tab order.

`DatePickerField` keeps the native field contract: its value is a local ISO date
(`YYYY-MM-DD`, never a UTC instant), it renders the it-IT calendar format, and a
named form control carries the value so native submission, reset and `required`
validation keep working. The trigger is a labelled button that opens the panel
right below the field; the floating label rests centred while the field is empty
and unfocused and takes the notch while it has a value or is focused. `readOnly`
keeps the committed value without a popup trigger, `today` moves the calendar's
reference day, and `onValueChange` reports the committed local ISO date.

The application owns any surrounding overlay beyond the field. The calendar does
not create hidden form values or submit a form when selecting, saving or
cancelling. The panel opens without a mount transition, shrinks in nested grids
while keeping at least a pointer-sized target, and its text can wrap. Weekdays are
Gregorian, headers use the Italian date order, and forced colours retain the
selected circles and range bands with the system Highlight and HighlightText
palette.
