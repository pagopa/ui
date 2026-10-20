`Table` retains the required `caption`, `columns` and `rows` interface. Use
`captionHidden` to preserve the accessible name without a visible caption.
Column `sort: { direction, onChange }` exposes a native keyboard control and
`aria-sort`; the application owns row ordering. `pagination` composes the
existing `Pagination`. Page and row-count changes remain controlled by the
application, which supplies its own rows-per-page control when it needs one.

The same table/control tree stacks labelled values in narrow containers,
including the source's mobile layout. `rowActions` renders contextual actions;
`emptyState` independently accepts title, description and actions. An empty
table displays the genuine Message artwork, not an empty grid or pagination.
Optional populated-table `title`, `description` and `actions` are additive
conveniences: the corresponding Figma booleans refer to the empty state.

Row and header actions keep accessible targets, and the source composition retains visible
mobile sorting; its empty state keeps an accessible action instead of the
source's text-sized one. `Chip size="compact"` supplies a static status;
removable chips retain a full-size action target. Ordered headers use the
genuine source arrows; the neutral bidirectional glyph is an explicit semantic
extension rather than pretending an unsorted column is descending.

## TableList

`TableList` is the container of the card-style list: a slot of `TableListItem`
rows, an optional `pagination` node and the empty fallback. `fields` returns the
labelled values of each row and `action` returns its trailing text action, so a
row without `action` stays static. The source stack spacing is preserved, and
the pagination hides with the rows.

`TableListItem` renders the source card; when its container is narrower than the
shared mobile container breakpoint it stacks the fields and aligns the action to
the end of the row. The first field takes the remaining space and the others
stay content-sized, like the source `flex-1` field. Each field has an optional
decorative artwork, a label and its value; `mono` selects the Body/Mono metrics
for codes, and the status field composes `Chip size="compact"`.

The source action is the `Apri` text button. The implementation keeps the shared ghost
target and its icon gap, and removes the horizontal padding so the label stays
flush with the card inset. `href` keeps a native link and `onPress` renders a
native button; `ariaLabel` gives repeated row actions their own context ("Apri
Titolo campagna"), as the source asks for a descriptive action name. The row
itself is not a control, because the source models the action as the Button
instance and a whole-row control would carry the concatenated field text as its
name.

The source cards are fill-only white surfaces drawn on the grey design page. On
the library's white application surface that grouping would disappear, so the
cards and the empty surface keep a visible stroke; the source fill, corners and
paddings are retained.

The empty state renders the genuine Message pictogram, a title, an optional
subtitle and an optional action inside a `role="status"` fallback, as the source
requests. A single-line row and the empty surface both grow over the source by
the accessible action target and the card stroke.
