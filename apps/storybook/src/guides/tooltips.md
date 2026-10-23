# Tooltip

`Tooltip` is a non-essential hint: it opens on hover and focus and closes with
Escape, blur or pointer exit. `side` places the bubble on a trigger side: the
source `Arrow Direction=Top` (arrow pointing up, bubble below the trigger) maps
to `side="bottom"`, and `Arrow Direction=Bottom` maps to `side="top"`.

| Source layer                                                                                         | Maps to                                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Content`                                                                                            | the popup: 16px padding, 4px gap, radius 8, `bg-tooltip`   |
| `Descrizione di approfondimento su più righe più righe più righe`                                     | the `children` copy at `text-label-mini` (14/20)           |
| `Close`                                                                                              | the decorative mark shown by `showClose`                   |
| `Indicator`                                                                                          | the arrow: the 24×16 `Polygon` plus its 4px standoff        |

The popup keeps the bubble 312px wide at most (`max-w-78`, the source `Content`
width), the close mark top-aligned with the first text line (`items-start`, the
source `Close` at the `Content` 16px inset) and the source label colour
`text-inverse-foreground`. The source `Indicator` pads its 24×16 polygon by 4px;
in the DOM the arrow is the polygon and the 4px standoff is the positioner
`sideOffset` between the trigger and the arrow.

`showClose` is visual only: the source declares no interaction, so the 10px mark
stays `aria-hidden` and the tooltip contains no action. Elevation comes only from
the Figma shadow scale (`shadow-32`).
