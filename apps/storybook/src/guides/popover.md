`Popover` is a small panel anchored to what it explains: an information icon, a
truncated cell, an action that needs one more sentence. `label` names the panel
and defaults to `Informazioni`; `closeLabel` names the close button. Both are
text props, so `UIProvider` also overrides them globally, through
`messages.popover.label` and `messages.popover.closeLabel`. The close button,
Escape, an outside press and the trigger all close it, and the primitive returns
focus to the trigger.

`arrowPosition` picks the edge carrying the indicator: `"top"` (the default)
places the bubble below the trigger with the arrow pointing up, `"bottom"` above
it. The arrow is placed by the positioning middleware, so it keeps pointing at
the trigger when the panel is shifted to stay in the viewport. `align`
(`start`, `center`, `end`) sets the horizontal alignment, and `modal` decides
whether the page behind the panel stays interactive.

## Controlling the panel

`open` with `onOpenChange` makes the popover controlled; `defaultOpen` opens it
initially when `open` is omitted. Both modes share one lifecycle: `onOpenChange`
runs whenever the popover asks to open or close, so a single handler answers the
trigger, an outside press, Escape and the close button.

```tsx
const [open, setOpen] = React.useState(false)

<Popover
  trigger={<Button>Apri</Button>}
  open={open}
  onOpenChange={setOpen}
  label="Informazione contestuale"
>
  <PopoverTitle>Informazione contestuale</PopoverTitle>
  Il pannello segue lo stato del componente.
</Popover>
```

`trigger` is optional. Omit it to open the panel from the caller's own state, and
pass `anchor` — the element the panel points at — so a panel opened from `open`
only still knows where to place itself.

`ref`, `className` and the standard `div` attributes land on the panel, so the
panel can be measured, styled and marked by the caller. `className` is merged
with the panel's own classes.
