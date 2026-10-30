<!-- component-rules:start -->

## Component Rules

- Give a group of actions 8px between them, vertically and horizontally.
- Keep 24px or 32px between a group of actions and the content above it, unless the page composition needs an exception.
- Never dim an action with opacity: every variant keeps a solid background that meets AA contrast.
- Do not use the disabled variant: it is not accessible. Keep the default action and explain the failure with an error toast.

<!-- component-rules:end -->

`Button` labels wrap only when the available width requires it; long words stay
inside the container rather than being clipped. Multiline actions grow without
losing their minimum target or native behaviour. Never restore a global `nowrap`.

`variant` folds style and colour into one axis: `default`, `outline`, `ghost`,
`contrast`, `outline-contrast`, `ghost-contrast`, `destructive`,
`outline-destructive`, `ghost-destructive`, plus `secondary` and `link`, which have
no source variant. `skeleton` replaces the visible label with a placeholder bar and
`loading` with a spinner; in both the label stays the accessible name, the button is
busy and stays focusable. Icons are content, not a prop: put the icon child before
or after the label.

Outlined buttons paint their stroke as an inset ring inside the shared inset, so a
contained and an outlined action with the same content share the box. Under forced
colours, which drop box shadows, every button falls back to a real border and the
skeleton bar paints in the system text colour. A loading error action paints its
spinner in the destructive colour.

Navigation and download links stay native `<a>` elements: give them the button
appearance with the internal `buttonVariants` helper; never render a Base UI `Button`
through an anchor `render` prop, which would mix button and link semantics.

A source text action (an Alert, Banner or Switch information link) keeps its text
line: reach the accessible pointer target with an expanded hit area rather than
inflating the visible box.

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
`orientation="vertical"` for stacked actions and `"horizontal"` for inline ones;
orientation does not change at a device breakpoint. Every group keeps the shared 8px
gap between its actions, in both orientations and for any number of children.
Horizontal groups wrap when their caller-constrained width cannot fit the actions.
The group defaults to its content width; callers choose `w-full` when the containing
layout should fill its available space. Keep the child controls as native `Button`s,
with their own `type`, accessible names, focus and submission behaviour.
