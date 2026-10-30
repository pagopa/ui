`Image` is the ratio box a content image fills, with a labelled fallback when
there is no image. `ratio` selects the box shape: `photo` is 4:3, `video` (the
default) is 16:9, `square` is 1:1, `cinema` is 21:9 and `portrait` is 3:4. The
source set draws only the ratio boxes; `ratio="wide"` (3:1) is a library
extension with no source frame.

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

The image fills the box edge to edge (`object-cover`) at the chosen ratio, so the
ratio belongs to the component and the crop to the artwork. Without `src`, or
after a loading error, the box keeps its ratio and shows the source's purple
surface with a decorative image icon and `fallbackLabel`. The fallback is one
`role="img"` element, named by `alt` and else by `fallbackLabel`, so the icon
never becomes the accessible name.
