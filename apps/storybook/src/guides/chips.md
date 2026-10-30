`Chip` maps the seven Figma `Type` values to `variant` (`default`, `error`,
`highlight`, `informative`, `neutral`, `success`, `warning`) and `Style` to
`appearance` (`solid` by default or `outline`). Use `size="compact"` for the
source's static chips. Label widths stay content-driven: do not add a fixed width
or a tracking compensation.

The default minimum height and the optional native remove action are
accessibility adaptations; `primary` remains a library extension. `removeLabel`
customizes the removal button name; the default is `Elimina {label}`.

## InputChip

`InputChip` is the neutral solid chip with the source close cell. The label box
holds the source insets and the gap, so the chip's own gap and padding stay zero
and the visible close glyph keeps its proportions instead of shrinking the whole
viewBox.

The removable state is a native `type="button"` with an accessible name and a
solid focus perimeter. Its visible control keeps the source cell and reaches an
accessible hit area through an invisible expansion; the chip itself is not
inflated. `pointerRemove` renders the same icon frame as an inert, hidden span for
containers that are already a button. The monochrome mask inherits `currentColor`
for forced-colour foregrounds, and no motion is added.
