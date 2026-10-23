# Attachment module

`AttachmentModule` implements the Figma set `AttachmentTile` (`10192:41460`),
one tile per `State` variant. The source `Content` frame is the tile itself:
8px radius, a 1px `#e8ebf1` INSIDE stroke, `#ffffff` fill and a 16px inset.

| Source layer  | Figma property      | Implementation                                                |
| ------------- | ------------------- | ------------------------------------------------------------- |
| `Title`       | `State=Available`   | the `title` prop as a blue Semibold link when `onOpen` is set |
| `Title`       | `State=Unavailable` | the `title` prop as plain `#0e0f13` Semibold text             |
| `Description` | 14/20 `#555c70`     | the `description` prop, optional                              |
| `Tag`         | `State=Unavailable` | the `status` slot; pass a `Tag` with the availability label   |
| `IconButton`  | `State=Available`   | the `onDownload` action with the source `download` glyph      |
| `IconButton`  | `State=Unavailable` | the source layer is hidden: no download action                |

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

`onOpen` turns the title into the source `State=Available` link; without it the
title stays plain text. `status` renders the caller-owned tag slot (the source
`State=Unavailable` composition) and `downloadLabel` is the accessible name of
the download action. The download action keeps the source 24px glyph box and
takes its pointer target from the invisible `::after` expansion, and the title
link does the same from its source line box; the visible box is never inflated.
The 1px `#e8ebf1` INSIDE stroke is the card family's `ring-1 ring-border`, so it
paints inside the 428px frame without consuming layout space.
