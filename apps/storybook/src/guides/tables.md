<!-- component-rules:start -->

## Component Rules

- Use the row list for flexible rows with long, wrapping content and low density; use the table for vertical comparison, sorting, filters and high density.

<!-- component-rules:end -->

`Table` retains the required `caption`, `columns` and `rows` interface. Use
`captionHidden` to preserve the accessible name without a visible caption. Column
`sort: { direction, onChange }` exposes a native keyboard control and `aria-sort`;
the application owns row ordering. `pagination` composes the existing `Pagination`,
and page and row-count changes stay controlled by the application, which supplies
its own rows-per-page control when it needs one.

The same table and control tree stacks labelled values in narrow containers,
including the mobile layout. `rowActions` renders contextual actions and
`emptyState` independently accepts a title, a description and actions; an empty
table displays the Message artwork, not an empty grid or pagination. A populated
table's own `title`, `description` and `actions` are additive conveniences.

Row and header actions keep accessible targets, and the mobile composition keeps
sorting visible. `Chip size="compact"` supplies a static status; removable chips
retain a full-size action target. Ordered headers use the source arrows, and the
neutral bidirectional glyph marks an unsorted column rather than pretending it is
descending.

`TableColumn.truncate` constrains one column, draws the value with an ellipsis and
opens the full value in a tooltip on hover and keyboard focus; `maxWidth` sets the
column measure (16rem by default). The designer chooses which cells truncate, and
the full value stays reachable without a mouse-only `title`.

The selection contract keeps the row selection controlled: `selectable`,
`selected`/`defaultSelected`, `onSelectionChange` and `selectionRowLabel`. The first
header cell is a select-all checkbox with the mixed state; each row gets a
checkbox, the row carries `aria-selected`, and `notification` puts the source dot
after the checkbox with a replaceable `notificationLabel`. The header checkbox is
named by `selectionLabel`.

## TableList

`TableList` is the container of the card-style list: a slot of `TableListItem` rows,
an optional `pagination` node and the empty fallback. `fields` returns the labelled
values of each row and `action` returns its trailing text action, so a row without
`action` stays static. The pagination hides with the rows.

`TableListItem` renders the card; in a container narrower than the shared mobile
breakpoint it stacks the fields and aligns the action to the end of the row. The
first field takes the remaining space and the others stay content-sized. Each field
has an optional decorative artwork, a label and its value; `mono` selects the mono
metrics for codes, and the status field composes `Chip size="compact"`.

The row action keeps the shared ghost target and its icon gap with the horizontal
padding removed, so the label stays flush with the card inset. `href` keeps a
native link and `onPress` renders a native button; `ariaLabel` gives repeated row
actions their own context ("Apri Titolo campagna"). The row itself is not a
control, because a whole-row control would carry the concatenated field text as
its name.

The source cards are fill-only white surfaces drawn on the grey design page; on a
white application surface that grouping disappears, so the cards and the empty
surface keep a visible stroke while the fill, corners and paddings are retained.

The empty state renders the Message pictogram, a title, an optional subtitle and an
optional action inside a `role="status"` fallback.
