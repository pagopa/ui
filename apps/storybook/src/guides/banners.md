`Banner` exposes the source White, Primary and Grey color treatments and the
Primary, Secondary and Tertiary hierarchies. `direction` selects the source
horizontal or vertical composition; vertical is used for the mobile cases.
Callers own the native action, optional Highlight Chip, source icon and Push
pictogram. The source icon and pictogram are decorative; the native dismiss
button retains the source close glyph and has an accessible name.

The source paddings, radius, accents, gaps and type scales map to the existing
tokens, and the retained border keeps visible separation and system-color
contrast without one-off padding compensation. Long titles and descriptions
wrap instead of being clipped; the component remains `w-full`, and the desktop
specimens use the source artboard width as an evidence viewport rather than a
fixed runtime width.

Text actions are content-sized in the source; their native targets grow to the
shared accessible minimum, and the close activation target grows while keeping
its glyph inside the source frame. Buttons remain native, non-submitting
controls in the examples, and the close button is keyboard-focusable with an
explicit solid focus perimeter. No dark application theme or motion is required
for this component.
