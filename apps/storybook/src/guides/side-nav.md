`SideNav` is the section navigation. Below `sm` it becomes a native `<details>`
with the source condensed head; from `sm` it is the sidebar column. `condensed`
renders the icon-only rail instead of the expanded panel.

The rail treats hover and keyboard focus the same way: the panel widens as an
overlay above the page, and the page beside it keeps its position. The link
label stays in the DOM as `sr-only`, so its accessible name never depends on the
visual state. A numeric `badgeCount` renders as a dot in the rail and as a
numbered badge in the expanded panel; the caller supplies `badgeLabel` for the
count in words. `chip` and `badge` return in the expanded panel; the chip is not
rendered on the rail.

A parent row carries a separate toggle with `aria-expanded` and an overridable
name through `expandLabel` / `collapseLabel` (defaulting to `Espandi {label}` and
`Comprimi {label}`). A parent with a current descendant starts open and keeps no
selected surface: only the current child paints the selected row. Items the
person cannot reach are not rendered at all, not disabled.
