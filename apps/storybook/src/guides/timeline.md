`Timeline` draws one row per event: a cursor column with its rail and either a
plain content block or a status card. `status` (`default`, `success`, `error`,
`warning`, `info`) selects the cursor fill and the card treatment; `dot`
(`outlined` or `small`) picks the cursor forms the source uses on the first and
last events, and `icon` overrides the status glyph.

The component reads the space it receives through a container query, so a
timeline inside a narrow panel gets the drawer composition without the caller
choosing a device. `correction` takes the caller's `CorrectionTag`, `timestamp`
takes `{ month, day, time }`, and `time` renders an upper-case caption under the
copy. The touchpoint group carries `touchpoints` or `recipients`.

The rail is one line: a row without a `timestamp` keeps the leading column
reserved when any sibling carries one, and the copy starts at the top of the row
next to its cursor, so cursors and titles never step sideways or drop below
their dot.

Every rendered and announced string is consumer-owned: the list name defaults to
`Cronologia` and is replaceable through `label`, the titles, descriptions,
timestamps and touchpoint labels are content, and each accordion row announces its
own `aria-expanded`.

## Timeline drawer

`TimelineDrawer` composes the drawer with this timeline: the panel carries the
source pictogram, `title` (default `Cronologia`), `description`, the events and the
optional `footer`, and reads `TimelineItem[]` from `items`.

The panel keeps the drawer's lifecycle. `open` with `onOpenChange` makes it
controlled, `defaultOpen` opens it initially when `open` is omitted, and
`trigger` is optional so the panel can open from the caller's own state. `ref`,
`className` and the standard `div` attributes land on the panel, merged with the
panel's own classes.
