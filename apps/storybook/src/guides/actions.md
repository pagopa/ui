`Button` labels wrap automatically only when the available width requires it;
long words remain inside the container rather than being clipped. Multiline
actions grow without losing their minimum target or native behavior. This is an
intentional accessibility adaptation. Never restore a global `nowrap`.

Navigation and download links stay native `<a>` elements. Give them the button
appearance with the internal `buttonVariants` helper; never render a Base UI
`Button` through an anchor `render` prop, which would mix button and link
semantics.

A source text action (an Alert, Banner or Switch information link) keeps its
text line: reach the accessible pointer target with an expanded hit area rather
than inflating the visible box.

Figma-mapped buttons use the shared button geometry through existing tokens; the
source skeleton takes the nearest existing width token, and the shared ghost
hit-area padding is an accessibility adaptation rather than the source's
content-sized frame.

## ButtonGroup

`ButtonGroup` is a named native `role="group"` wrapper. Use
`orientation="vertical"` for stacked actions and `"horizontal"` for inline
actions; orientation does not change at a device breakpoint. Horizontal groups
wrap when their caller-constrained width cannot fit the actions. The group
defaults to its content width; callers choose `w-full` when the containing
layout should fill its available space. Keep the child controls as native
`Button`s, with their own `type`, accessible names, focus and submission
behavior.

The source `BlockButtons` set maps through these real compositions:

- `123:4499` (`Buttons=1`, `Inline=False`, `Device=Any`): one action.
- `123:4501` (`Buttons=2`, `Inline=False`, `Device=Any`): two stacked actions.
- `123:4504` (`Buttons=3`, `Inline=False`, `Device=Mobile`): one action above a pair.
- `123:4508` (`Buttons=2`, `Inline=True`, `Device=Any`): an inline pair.
- `2939:34214` (`Buttons=3`, `Inline=True`, `Device=Desktop`): one action before a pair.
- `2939:34947` (`Buttons=2`, `Inline=True`, `Device=Desktop`): an inline pair.

The source evidence frames are fixtures, not runtime widths or breakpoints;
callers own those constraints. Source text actions are content-sized, while the
shared `Button` retains its minimum accessible target.
