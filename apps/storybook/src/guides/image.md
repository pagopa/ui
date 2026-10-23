# Image

`Image` implements the Figma component set `Image` (`8818:39878`): the ratio box
a content image fills, with a labelled fallback when there is no image.

| Source variant      | Source property    | Implementation            |
| ------------------- | ------------------ | ------------------------- |
| `Aspect ratio=1:1`  | 360×360, `#ddd1f9` | `ratio="square"`          |
| `Aspect ratio=4:3`  | 360×270            | `ratio="photo"`           |
| `Aspect ratio=16:9` | 360×203            | `ratio="video"` (default) |
| `Aspect ratio=21:9` | 360×154            | `ratio="cinema"`          |
| `Aspect ratio=3:4`  | 360×480            | `ratio="portrait"`        |

The set draws only the ratio boxes, filled with
`Color/Han Purple/Han Purple 100` `#ddd1f9`: the surface the artwork lands on.
`ratio="wide"` (3:1) is a library extension with no source frame.

## Example

```tsx
<Image
  src={service.cover}
  alt="Il servizio nell'app IO"
  ratio="photo"
  fallbackLabel="Immagine non disponibile"
/>
```

## Behaviour

The image fills the box edge to edge (`object-cover`) at the chosen ratio, so
the ratio belongs to the component and the crop to the artwork. Without `src`,
or after a loading error, the box keeps its ratio and shows the source purple
surface with a decorative image icon and `fallbackLabel`; the fallback is one
`role="img"` element, named by `alt` and else by `fallbackLabel`, so the icon
never becomes the accessible name. The surface colour is the source's; the icon
and the label are the component's own fallback, because the source frame draws a
placeholder box and no content.
