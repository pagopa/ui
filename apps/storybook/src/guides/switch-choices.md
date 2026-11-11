`SwitchField` composes the shared `Switch` with a native label and associated
description and validation. `indicatorPlacement="end"` is the rich layout and
remains the default; `"start"` selects the control-before-copy layout. Changing
placement does not remount the control or reset its selection.

```tsx
<SwitchField
  label="Aggiornamenti della pratica"
  name="updates"
  defaultChecked
  indicatorPlacement="start"
  icon={<PagoPAIcon name="mobile_2" />}
  description="Ricevi una comunicazione quando cambia lo stato."
  learnMore={{ label: "Scopri gli aggiornamenti", href: "/servizi/aggiornamenti" }}
/>
```

The `icon` slot is decorative and never changes the accessible name. The optional
`learnMore` is an independent native link, not part of the toggle label; it keeps
keyboard and new-tab behaviour and stays usable when the choice is disabled or
loading. When the title is hidden, supply a visually hidden React label rather
than removing the control's accessible name, and omit `description` when no
supporting copy is needed.

`availability` defaults to `"yes"`. `"no"` dims only the decorative icon, leaving
the checked value, the native enabled state and form submission untouched: it is a
visual source state, not a replacement for `disabled`, and dimming the whole
option would make the active content fail contrast.

Both interfaces accept `loading`: it sets the busy and unavailable state without
losing the actual selection and, as with native `disabled`, the input is excluded
from `FormData`; completing loading restores submission of the same selected
value. The loading ring is decorative, not another status region, and the
application owns completion announcements.

The native target is larger than the source frame, and information links keep
their text line and reach the accessible pointer target through an expanded hit
area with a solid focus perimeter. Forced colours preserve the system-coloured
track, knob positions and loading ring, and long text wraps in narrow nested grids
without clipping.

`SwitchGroup` is the separate fieldset and legend collection extension. The source
set that carries the "SwitchGroup" name is a single rich option and maps to
`SwitchField`: source names never determine identity or composition.
