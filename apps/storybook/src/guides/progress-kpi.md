# ProgressKpi

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
  footer values. The cue is decorative: the value/total pair carries the state.
- `details` renders the multi form: one row per `ProgressKpiRow` with its own
  label, bar and footer. Rows are caller data, so the count is not a prop.
- `channel` and `info` are optional slots: the caller passes the artwork, the
  component owns the 24px box on each side of the title.

## Figma source mapping

The set `12133:82475` (`ProgressKpiCard`) declares the `Type` axis with two
variants and no device axis. The capture uses the 202px source width in both.

### `Type=Default` (`9612:4303`, 202x190)

- Root card (`r=24`, 1px `#e8ebf1` stroke, `#ffffff` fill, 24px padding, 12px
  vertical gap) maps to the `section`: `rounded-3xl border bg-background p-6` and
  `grid gap-3`.
- `Stack-Header` (154x24, 8px horizontal gap, centred) holds the `send` channel
  artwork (24x24), the `Title` (16px Semibold, line height 22, `#555c70`, the
  growing slot) and the `info` artwork (24x24, `#0b3ee3`).
- `.ProgressKpiBody` (12px gap) holds `Percentage` (32px Bold, line height 48,
  `#0e0f13`) and `.ProgressKpiData` (8px gap): `LinearProgress` (154x16, `r=16`,
  `#e8ebf1`, with the `LinearProgress single item` fill `#0b3ee3`) and
  `Stack-Footer` (2px gap: `CurrentValue` 16/22 Semibold and `TotalValue` 14/20
  Regular, both `#0e0f13`).
- The source draws `6.000` of `11.000` but labels the card `51%`; the component
  derives the percentage, so the fidelity story uses `51` of `100` to keep the
  bar and the number of the source while the copy stays caller-owned.

### `Type=Multi` (`12133:82476`, 202x282)

- The same header and main body, plus the `Data` slot (10px gap) with one
  `.ProgressKpiData` row (8px vertical padding, 8px gap) — the `Description`
  (12px Semibold, line height 18, `#555c70`), an 8px `LinearProgress` and its own
  footer. It maps to `details` and the row's `label`, `value`, `total` and
  `completed`.
- The single row is the source's own sample; a caller passes as many rows as its
  data has.

## Adaptations

- `text-title-xl-mobile` (32/48 Bold) carries the `Percentage`: it is the only
  scale step with the source's three values, so no new text token is needed. The
  name records where the step also appears; the source does not resize the
  number, so it is used at every width.
- The source stroke is drawn inside the frame while the CSS border occupies 2px
  of the same 202px card, so the inner frames measure 152 against the source 154
  and the card 2px taller: within the 2px tolerance, no residue.
- The bars use `rounded-2xl` (the 16px radius step): the browser clamps it to the
  bar height, exactly the source's `r=16` pill.
- The channel and info slots are flex boxes that keep the artwork's own 24px
  size instead of adding the inline line-box descender; the card reflows at
  320px with 200% text.
