<!-- component-rules:start -->

## Component Rules

- Reserve the tooltip for one short, unstructured string — five or six words at most — that explains an action icon or a truncated table cell.
- Put multi-line copy, regulatory or technical details, and information needed on mobile in a Popover instead.
- Open a Popover on click or tap only, never on hover, and close it on its close button, on a backdrop click or with Escape.
- Avoid tooltips in new interfaces: on mobile the bubble stays on screen until the reader taps elsewhere.
- Trigger the tooltip from an information icon placed next to the element it explains.

<!-- component-rules:end -->

`Tooltip` is a non-essential hint: it opens on hover and focus and closes with
Escape, blur or pointer exit. `side` places the bubble on a trigger side: the
source `Arrow Direction=Top` (arrow pointing up, bubble below the trigger) maps to
`side="bottom"`, and `Arrow Direction=Bottom` maps to `side="top"`. The bubble is
width-capped, so a long string wraps instead of stretching it.

`showClose` is visual only: the source declares no interaction, so the close mark
stays `aria-hidden` and the tooltip contains no action.

## Controlling the bubble

`open` with `onOpenChange` makes the tooltip controlled; `defaultOpen` opens it
initially when `open` is omitted. Both modes share one lifecycle: `onOpenChange`
runs whenever the tooltip asks to open or close, so a single handler answers
hover, focus and Escape.

`trigger` is optional. Omit it to show the hint from the caller's own state, and
pass `anchor` — the element the bubble points at — so a bubble opened from `open`
only still knows where to place itself.

`ref`, `className` and the standard `div` attributes land on the bubble, so it
can be measured, styled and marked by the caller. `className` is merged with the
bubble's own classes, and the width cap still applies.
