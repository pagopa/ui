# Timeline

`Timeline` implements the element set `12812:16248` and its four private cursor
components (`.TimelineDot/Success`, `/Error`, `/Warning`, `/Info`). The element
draws one row per event: a 24px cursor column, an 8px root gap and either a plain
content block or a status card.

| Source layer               | Code                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `Dot` + 6px outside stroke | `<TimelineDot>`: 12px dot, 6px halo                               |
| `Rectangle 777`            | the rail, one continuous line per non-last item                   |
| status card                | `status="default" \| "success" \| "error" \| "warning" \| "info"` |
| `Correction tag`           | `correction` (caller-owned content)                               |
| `Timestamp`                | `timestamp={{ month, day, time }}`                                |
| touchpoint accordion       | `touchpoints` or `recipients`                                     |

The cursor fill follows the status: success #427940, error #d13333, warning
#a5822a, info #418daf and the neutral decorative-secondary #bbc2d6. The halo is
the source 6px outside stroke at 35% opacity. `dot="outlined"` draws the empty
ring and `dot="small"` the 6px dot, the two cursor forms the source uses on the
first and last events.

The set pairs its composition with the `Device` axis, but both frames are 848
wide: the 8px inset, the 8px icon gap and the stacked header belong to the
drawer-width frames. The component reads the space it receives, through the
container query `@max-[27rem]/timeline`, so a timeline inside a narrow panel gets
the drawer composition without the caller choosing a device.

The status card keeps the source 16px radius, the 1px border over the soft fill,
the 24px status glyph, the 4px message gap and the 14/20 description. The gap
from the title to the description is 4px; when the description is absent, the
gap from the title to the touchpoint group is 12px. The plain composition mirrors
the same rhythm. `icon`
overrides the status glyph; `correction` is the caller's tag. Every rendered and
announced string is consumer-owned: the list name defaults to `Cronologia` and is
replaceable through `label`, the titles, descriptions, timestamps and touchpoint
labels are content, and each accordion row announces its own `aria-expanded`.
