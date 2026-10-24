# Side navigation

`SideNav` implements the section navigation set `1120:7458`. On narrow screens it
becomes a native `<details>` with the source condensed head (`1519:2721`); from
the `sm` breakpoint it is the 300px column. `condensed` maps the source
`Condensed=True` desktop variant (`1130:11242`): a 72px rail with icon-only rows
and 44px targets.

The rail treats hover and keyboard focus the same way: the panel widens to
300px as an overlay with a raised stacking order, and the page beside it keeps
its position. The link label stays in the DOM as `sr-only`, so its accessible
name never depends on the visual state. A numeric `badgeCount` renders as the
source dot in the rail and as the source numbered badge in the expanded panel;
the caller supplies `badgeLabel` for the count in words. `chip` and `badge`
return in the overlay, and the chip is not rendered on the rail.

A parent row carries a separate toggle with `aria-expanded` and an overridable
name (`expandLabel` / `collapseLabel`, defaulting to `Espandi {label}` and
`Comprimi {label}`). A parent with a current descendant starts open and stays
without the selected surface: only the current child paints the blue row and its
right bar. Items the person cannot reach are not rendered at all, not disabled.
