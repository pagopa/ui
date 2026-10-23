# Badge

`Badge` keeps its existing `display="label"` treatment for short, non-interactive
labels such as a service status. The Figma notification component is expressed
with `display="numbered"`, `"plain"` or `"sidenav-icon"`; these are visual
indicators, not controls.

| Source variant | Props                                                        |
| -------------- | ------------------------------------------------------------ |
| `360:800`      | `display="numbered"`                                         |
| `9828:23894`   | `display="plain" background="transparent"`                   |
| `360:810`      | `display="plain" background="white"`                         |
| `382:6343`     | `display="plain" background="muted"`                         |
| `363:7629`     | `display="sidenav-icon" selected={false} background="white"` |
| `363:7574`     | `display="sidenav-icon" selected background="primary"`       |

The sidenav form accepts the icon as its child and overlays the indicator without
clipping it. The story uses the pinned `mail` artwork and its source
`unselected`/`selected` variants. All forms use the existing tokens instead of
near-match literals.

The source `Badge`/`Badge-Wrapper` ellipses carry a separation stroke: white on
the white surfaces (`ring-background`), grey 50 on the muted surface
(`ring-muted`) and blue 50 on the selected sidenav form (`ring-selection-soft`).
The 2.5px source stroke becomes the 2px `ring-2` box-shadow, so the parity probe
reads no border and the ring is recorded as a residue.

## Accessibility

The plain dot and sidenav composition are hidden from assistive technology;
their containing link or button owns the accessible name and an adequate target.
A numbered count remains text; include it in the containing control's accessible
name when it conveys status. The component itself has no keyboard interaction.
Forced-colors mode uses system Highlight/Canvas colors so the dot and its
perimeter remain distinguishable; the indicators are static under reduced
motion.

The Figma sidenav references export at the component bounds and clip the
indicator's overflow. The runtime keeps that overflow visible; the source case
checks the dot against the icon frame instead of treating the clipped export as
missing art.
