`Chip` maps the seven Figma `Type` values to `variant` (`default`, `error`,
`highlight`, `informative`, `neutral`, `success`, `warning`) and `Style` to
`appearance` (`solid` by default or `outline`). Use `size="compact"` for the
source's static chips. The default minimum height and the optional native remove
action are accessibility adaptations; `primary` remains a library extension.
`removeLabel` customizes the removal button name.

The compact source frame maps to the existing height, padding and radius tokens;
label widths remain content-driven instead of compensating for font metrics. With
the bundled Titillio family the labels now measure the source widths exactly
(57/58/63/62/40/44/66), so the full-pill radius (source 100, painted by
`rounded-full`) is the only recorded residue; every `Type`/`Style` variant has a
reviewed case on `ChipSourceVariantMatrix`.

## InputChip — Figma node `422:16012`

The assigned source set currently has one real variant, `422:16019`
(`Type=Neutral, Style=Solid`). Its label and close cells map to the shared
height, padding, gap and radius tokens; `PagoPAIcon` uses the existing `close`
small artwork, so the visible X keeps the source proportions instead of
shrinking the whole viewBox.

Label widths stay content-driven and are not forced to the sample label; the
remaining difference is a substitute-font measurement pending re-measurement
under the bundled family. Do not add a fixed width or tracking compensation.

The removable state is a native `type="button"` with an accessible name and a
solid focus perimeter. Its visible control keeps the source cell and reaches an
accessible hit area through an invisible expansion; the chip itself is not
inflated. The decorative variant uses the same icon
frame as an inert, hidden span inside a single button. The monochrome mask
inherits `currentColor` for forced-color foregrounds; no motion is added.
