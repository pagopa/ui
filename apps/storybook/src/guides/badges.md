`Badge` keeps its existing `display="label"` treatment for short, non-interactive
labels such as a service status. The Figma notification component is expressed
with `display="numbered"`, `"plain"` or `"sidenav-icon"`; these are visual
indicators, not controls. `background` selects the surface the form sits on:
`transparent`, `white`, `muted`, or `primary` on the selected sidenav form.

The sidenav form accepts the icon as its child and overlays the indicator without
clipping it. All forms use the existing tokens instead of near-match literals, and
the separation ring follows the surface underneath.

## Accessibility

The plain dot and the sidenav composition are hidden from assistive technology;
their containing link or button owns the accessible name and an adequate target.
A numbered count remains text; include it in the containing control's accessible
name when it conveys status. The component itself has no keyboard interaction.
Forced-colours mode uses the system Highlight and Canvas colours so the dot and its
perimeter stay distinguishable, and the indicators are static under reduced
motion.
