<!-- component-rules:start -->

## Component Rules

- Keep 24px of space around a banner when composing it into a page.

<!-- component-rules:end -->

`Banner` exposes the source White, Primary and Grey colour treatments and the
Primary, Secondary and Tertiary hierarchies. `direction` selects the horizontal
or vertical composition; vertical is the mobile case. Callers own the native
action, the optional Highlight Chip, the source icon and the Push pictogram.

Every treatment is a light surface, so the action follows its hierarchy rather
than the surface colour: Primary takes a text action (`ghost`), Secondary a
filled `default`, Tertiary a `link`. The `*-contrast` button family paints white
and belongs to brand and dark surfaces only: on the Primary fill it measures
1.18:1 and is never the banner action.

`title` is optional: without it the banner renders no heading and takes its
accessible name from `label`. The source icon and pictogram are decorative. The
close button is a native, keyboard-focusable icon button with an accessible name
and an explicit solid focus perimeter, and the other actions stay native,
non-submitting controls whose targets reach the shared accessible minimum
without growing their text line. Long titles and descriptions wrap instead of
being clipped, and the component stays `w-full` and content-driven. No dark
application theme or motion is required.
