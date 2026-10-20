`SwitchField` composes the shared `Switch` with a native label and associated
description/validation. `indicatorPlacement="end"` is the existing rich layout
and remains the default; `"start"` selects the source control-before-copy layout.
Changing placement does not remount the control or reset its selection.

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

The `icon` slot is decorative and never changes the accessible name. Optional
`learnMore` is an independent native link, not part of the toggle label; it
retains keyboard/new-tab behavior and stays usable when the choice is disabled
or loading. When the source hides its title, supply a visually hidden React
label rather than removing the control's accessible name. Omit `description`
when no supporting copy is needed.

`availability` defaults to `"yes"`. `"no"` retains the rich source variant's
reduced-opacity treatment only on the decorative icon, without changing the
switch's checked value, native enabled state, or form submission. It is a
visual source state, not a replacement for `disabled`. Text, the enabled
control, information links and focus perimeters stay fully opaque; dimming the
whole option would make active content fail contrast requirements. Forced
colors restore the icon's full opacity.

Both interfaces accept `loading`: it sets busy/unavailable state without losing
the actual selection or default. As with native `disabled`, the input is
excluded from `FormData`; completing loading restores submission of the same
selected value. The source loading ring is decorative, not another status
region. The application owns completion announcements.

The reviewed artwork maps the source track and knob, hover halos, focus dot and
loading ring to the shared tokens. The native target is larger than the source
frame, and the retained small variant keeps its own target. Information links
keep their text line and reach the accessible pointer target through an
expanded hit area, not an inflated box, with a solid focus perimeter. Forced colors
preserve system-colored track/knob positions and the loading ring, and long
text wraps in narrow nested grids without clipping. Content-driven heights,
legible disabled copy, shared feedback typography and the bundled font are
deliberate adaptations, not pixel-identical source certification.

Node `349:4683` exposes four checked/availability variants; every inspected
nested source switch has `Enable=True`, so `Availability=No` is not mapped to a
disabled native switch. The two “No” source roots have reduced opacity; limiting
that treatment to decorative artwork is a deliberate accessibility adaptation,
not whole-option source parity. Selection and submission remain native. The
source artboards are content-driven samples; the implementation preserves the
accessible control and link targets instead of fixing those sample heights.

`SwitchGroup` is the separate fieldset/legend collection extension. Figma node
`349:4683`, despite its “SwitchGroup” name, is a single rich option and maps to
`SwitchField`; source names never determine identity or composition.
