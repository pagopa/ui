`Dialog` is a modal surface built on Base UI's Dialog: the focus trap, Escape,
the scroll lock, the outside press, the focus restoration and the backdrop fade
come from the primitive. The title is the dialog's accessible name, `description`
is supporting copy, `children` is the body and `footer` the action row.

`closeLabel` overrides the close button's accessible name (default
`messages.dialog.closeLabel`), so `UIProvider` can also set it once for the whole
application. The title names the panel; there is no separate `ariaLabel`.

## Example

```tsx
// Uncontrolled: the dialog owns its state.
<Dialog
  trigger={<Button>Apri</Button>}
  title="Conferma operazione"
  closeLabel="Chiudi la finestra"
/>

// Controlled: the caller decides when it opens.
const [open, setOpen] = React.useState(false)

<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Riepilogo della pratica"
  footer={<DialogClose variant="outline">Chiudi</DialogClose>}
/>
```

## Behaviour

`open` with `onOpenChange` makes the dialog controlled; `defaultOpen` opens it
initially when `open` is omitted. Both modes share one lifecycle: `onOpenChange`
runs whenever the dialog asks to open or close, so a single handler answers the
trigger, an outside press, Escape, the close button and a `DialogClose`.

`trigger` is optional. Omit it to open the panel from the caller's own state — an
async handler that resolves before opening, a form submission, the URL. With no
trigger there is no element to return focus to, so the dialog gives focus back to
the element focused before it opened.

`DialogClose` is a button that closes the panel it sits in. Use it for actions
inside the composition, such as a cancel action in `footer`, where wiring the
same `onOpenChange` by hand would repeat the close path.

`ref`, `className` and the standard `div` attributes land on the panel, so the
panel can be measured, styled and marked by the caller. `className` is merged
with the panel's own classes.
