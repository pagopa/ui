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

Every rendered and announced string is consumer-owned: the list name defaults to
`Cronologia` and is replaceable through `label`, the titles, descriptions,
timestamps and touchpoint labels are content, and each accordion row announces its
own `aria-expanded`.
