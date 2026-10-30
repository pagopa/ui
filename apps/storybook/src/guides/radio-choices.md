`RadioGroup` names the native collection with its legend. `RadioField` keeps the
source radio artwork with an enlarged hit area and an enclosing native label;
description, validation and required state stay associated with the control. Use
`indicatorPlacement="end"` and the optional `leadingIcon` and `description` for
the rich option rather than exposing a second one-item interface.

`RadioGroupItem` maps the `RadioButtonSingleElement` states to the native radio
state: `Status=Default` is the unchecked artwork, `Status=Active` the checked
primary artwork and `Status=Feedback error` the unchecked destructive artwork.
The transparent target expansion and the external solid focus perimeter are
accessibility adaptations.

```tsx
<RadioGroup legend="Canale di conferma" name="contact" defaultValue="email">
  <RadioField
    value="email"
    label="Email"
    icon={<PagoPAIcon name="notifications_active" />}
    indicatorPlacement="end"
    description="Ricevi i documenti via email."
  />
</RadioGroup>
```

`loading` composes the skeleton layouts from the supplied icon and description.
The option retains its accessible name and real checked state, announces busy and
unavailable, and follows native disabled-control submission exclusion; completing
loading does not reset the selection, which intentionally differs from the
source's unchecked skeleton indicator. Text rows can grow and feedback is not
clipped.
