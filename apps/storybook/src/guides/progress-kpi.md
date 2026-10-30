<!-- component-rules:start -->

## Component Rules

- Up to four cards per row; on mobile use the mobile variant as a peek carousel, never stack; switch the state through the nested instance; the info icon opens a tooltip, not a modal.

<!-- component-rules:end -->

`ProgressKpi` is a KPI card: a channel and a title, a percentage over a bar, the
`value`/`total` footer and, in the multi form, a list of secondary rows. Every
visible string and every number is a caller prop.

## Behaviour and accessibility

- `value` and `total` are the caller's data; the percentage is derived
  (`value / total`, rounded, capped at 100), so the bar and the big number never
  disagree. `locale` owns the number formatting (BCP 47, `it-IT` by default).
- The card is a `section` named by `label`. The bar is a `progressbar` with
  `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and the percentage as its
  name; the channel and the info artwork are decorative.
- `completed` turns the bar green and adds the `check_circle` cue next to the
  footer values. The cue is decorative: the value and total pair carries the
  state.
- `details` renders the multi form: one row per `ProgressKpiRow` with its own
  label, bar and footer. Rows are caller data, so the count is not a prop.
- `channel` and `info` are optional slots: the caller passes the artwork, the
  component owns its box on each side of the title.

The set declares no device axis and the card has no fixed width: it reflows in
narrow containers and with 200% text.
