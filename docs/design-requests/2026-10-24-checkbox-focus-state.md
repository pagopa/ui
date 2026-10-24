# Design request — Checkbox: should focus paint an unchecked box red?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/27
- Status: open
- Decision owner: @gunzip
- Preview: none (the implemented state is the `Checkbox` story `SourceFocused`; the error state is `Invalid`)
- Figma node: `194:3654` (`CheckboxSingleElement`), variant `Status=Focused` `194:3659`
- Comment thread: `1950671869` (2026-10-02)

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

Pending. Option A is the recommendation and the current implementation.
