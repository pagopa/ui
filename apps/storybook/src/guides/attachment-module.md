`AttachmentModule` renders one attachment tile: the `State=Available`
composition is the `title` as a link plus the download action, the
`State=Unavailable` one is the plain `title` with a caller-owned `Tag` and no
download action.

## Example

```tsx
<AttachmentModule
  title="Ingiunzione di pagamento.pdf"
  description="Disponibile online fino al 31/12/2026."
  onOpen={openAttachment}
  onDownload={downloadAttachment}
  downloadLabel="Scarica l'allegato"
/>
```

## Behaviour

`onOpen` turns the title into the `Available` link; without it the title stays
plain text. `description` is optional, `status` renders the caller-owned tag slot
of the `Unavailable` composition and `downloadLabel` is the accessible name of
the download action. The download action and the title link take their pointer
target from an invisible expansion on their own line box, so the visible box is
never inflated. The card's inside stroke comes from the card family ring, so it
paints inside the frame without consuming layout space.
