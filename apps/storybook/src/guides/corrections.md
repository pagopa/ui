# Correction tags

`CorrectionValid` and `CorrectionNotValid` implement the Figma components
`Correction/Valid` (`9676:5453`) and `Correction/NotValid` (`9676:5455`). Each
one is a single `Tag` instance: a 30px success or warning status tag with the
source glyph and the uppercase 12/18 label.

| Source                     | `CorrectionValid`                     | `CorrectionNotValid`                 |
| -------------------------- | ------------------------------------- | ------------------------------------ |
| `9676:5447` / `9676:5456`  | `Tag status="success"`                | `Tag status="warning"`               |
| `check_circle` / `warning` | 16×16 `check_circle`                  | 16×16 `warning`                      |
| `label`                    | `label`, default “EVENTO RETTIFICATO” | `label`, default “EVENTO NON VALIDO” |

The source frame is 164×30 (`Correction/Valid`) and 160×30
(`Correction/NotValid`): the shared `Tag` padding (6/8), 6px radius, 1px
`#e8ebf1` stroke and white surface, with the 6px icon-label gap. The `Tag`
renders its 32px minimum height against the source 30, inside the 2px tolerance,
and the 1px CSS border sits inside the 8px inset. The outer frame's 10px
vertical gap is a single-child phantom gap and is not mapped.

## Example

```tsx
<CorrectionNotValid />
<CorrectionValid label="Evento rettificato dal gestore" />
```

`label` is the visible text and the only content: the icon is decorative, so the
tag is announced by its copy. The default is Italian and every consumer can
replace it.

Both tags are composed by `Microevento` and by the Timeline status card; the
parity story `Source` frames each one at its own source width plus the 2px the
CSS border adds (166 and 162), because the source inside stroke does not grow
the box.
