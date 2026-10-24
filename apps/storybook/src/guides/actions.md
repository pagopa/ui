<!-- component-rules:start -->

## Component Rules

- Give a group of actions 8px between them, vertically and horizontally.
- Keep 24px or 32px between a group of actions and the content above it, unless the page composition needs an exception.
- Never dim an action with opacity: every variant keeps a solid background that meets AA contrast.
- Do not use the disabled variant: it is not accessible. Keep the default action and explain the failure with an error toast.

<!-- component-rules:end -->

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

The source `IconButton` (`192:1208`) is a single 44×44 frame: it maps to the
ghost, icon-size `Button`, whose 44×44 box holds the 24px `menu` icon instance
(18×12 glyph) at 10,10. The button's accessible name replaces the label-less
source glyph; the transparent interaction surface, the visible focus perimeter
and the 8px hover radius are the recorded accessibility adaptations.

Figma-mapped buttons use the shared button geometry through existing tokens; the
source skeleton takes the nearest existing width token, and the shared ghost
hit-area padding is an accessibility adaptation rather than the source's
content-sized frame. Outlined buttons paint their 2px stroke as an inset ring
inside the 24px inset, like the source's inside stroke, so a contained and an
outlined action with the same content share the same box; under forced colors,
which drop box shadows, every button falls back to a real border and the
skeleton bar paints in the system text colour so it stays visible. A loading
error action paints its spinner in the destructive colour, as the source does.

The source `Button` set (`108:1402`) maps to the props as follows:

- `Variant` folds style and colour into one axis, and so does `variant`:
  `Contained` → `"default"`, `Outlined` → `"outline"`, `Text` → `"ghost"`,
  `Contained contrast` → `"contrast"`, `Outlined contrast` →
  `"outline-contrast"`, `Text contrast` → `"ghost-contrast"`,
  `Contained error` → `"destructive"`, `Outlined error` →
  `"outline-destructive"`, `Text error` → `"ghost-destructive"`. `secondary`
  and `link` have no source variant.
- `Icon` is content, not a prop: `None` is a label alone, `<- Left` puts the
  icon child before the label and `Right ->` after it.
- `Skeleton=True` → `skeleton`: the placeholder bar replaces the visible label,
  which stays the accessible name; the button is busy and stays focusable.
- `Spinner=True` → `loading`: the spinner replaces the visible label, which
  stays the accessible name; the button is busy and stays focusable.

```tsx
<Button variant="outline-destructive">
  <Star aria-hidden />
  Elimina
</Button>
<Button variant="ghost-contrast" loading>
  Invia
</Button>
```

## ButtonGroup

`ButtonGroup` is a named native `role="group"` wrapper. Use
`orientation="vertical"` for stacked actions and `"horizontal"` for inline
actions; orientation does not change at a device breakpoint. Every group keeps
8px between its actions, in both orientations and for any number of children.
Horizontal groups wrap when their caller-constrained width cannot fit the
actions. The group defaults to its content width; callers choose `w-full` when
the containing layout should fill its available space. Keep the child controls as
native `Button`s, with their own `type`, accessible names, focus and submission
behavior.

The imported rule sets 8px between actions, while the `BlockButtons` variants
draw their outer stack and row at 24px. The component follows the rule; the
source drawings stay the reference for the actions themselves, so a
source-fidelity render records the 16px difference instead of hiding it.

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
