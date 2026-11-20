# Design request — Checkbox: should focus paint an unchecked box red?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/27
- Status: answered — the source answered in the 2026-11-20 drift; option A is drawn
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-checkbox-focus--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-checkbox-focus--option-b
- Figma node: `194:3654` (`CheckboxSingleElement`), variant `Status=Focused` `194:3659`
- Comment thread: `1950671869` (2026-10-02)

## Update — 20 November 2026

The source answered the question in the drift of 20 November (pinned version
`2423639827979135905`): option A. The variant named `Status=Focused` that painted
the uncovered glyph red is renamed `Status=Feedback` (`194:3659`, glyph
`#d13333`) — red is the invalid state, not focus — and a real `Status=Focused`
is drawn next to it:

| Set                    | Variant            | Node          | Drawing                                                                   |
| ---------------------- | ------------------ | ------------- | ------------------------------------------------------------------------- |
| `CheckboxSingleElement`| `Status=Feedback`  | `194:3659`    | `check_box` in `#D13333`, uncovered                                           |
| `CheckboxSingleElement`| `Status=Focused`   | `16548:43287` | blue `check_box` plus a 22x22 perimeter, radius 4, 2px `#3C65E9` inside the 24px box |
| `RadioButtonSingleElement` | `Status=Focused` | `16548:42601` | blue `check_circle` plus a 24x24 `Ellipse`, 2px `#3C65E9` inside the frame |

The implementation already followed option A, so nothing changes: the shared
`focus-visible` perimeter paints focus and `aria-invalid` paints the glyph red.
Two adaptations stay recorded in the node notes and in
[the focus perimeter request](./2026-10-24-focus-perimeter.md): the library draws
its perimeter **outside** the box (`outline-offset: 2`) so the 24px glyph keeps
its size, and it draws it in the shared ring blue-500 (`#0B3EE3`) rather than the
source blue-400 (`#3C65E9`). Both are visible as recorded residues in
`194-3654-focused`, `194-3677-focused` and `194-3841-focused`.

The checkbox set also carries a naming defect introduced by the same drift —
`Status=Status6` on the focused row of `CheckboxWithLabel`, and a stray `Ellipse 6`
in `RadioButtonWithLabel` — filed separately in
[the focused variant name request](./2026-11-20-checkbox-focused-variant-name.md).
The issue is left to its decision owner: the source answered, this document does
not close it.

The sections below preserve the 24 October reading; `Status=Focused` there is the
variant the drift renamed `Status=Feedback`.

## Context

The source `Status=Focused` variant paints the uncovered glyph `#d13333`. The
thread asks what the checkbox focus behaviour is. The library already draws a
solid blue focus perimeter on every focusable control, and `aria-invalid` paints
the control red. A red glyph on plain focus reads as an error before the person
has answered.

The code follows option A: `focus:data-unchecked:text-destructive` was removed,
the shared `focus-visible` perimeter stays and the invalid state stays red. The
node remains `implemented` for the drawn variants; this question decides the
source reading, not the mapping.

## Options

1. **Focus is the shared blue perimeter; red only when invalid.** The unchecked
   glyph keeps its normal colour on focus. `aria-invalid` paints it red.
2. **Focus is red, as drawn.** Every focused unchecked box turns red; the error
   state needs another cue because red is already used.

## Decision

Answered by the source on 20 November 2026: **option A**. Focus is the shared
blue perimeter and red is `Status=Feedback`, the `aria-invalid` state. The source
now draws both variants explicitly, so the reading that produced the earlier
recommendation no longer rests on our adaptation alone.
