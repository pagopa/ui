`CameraView` is the framing overlay a camera preview paints around the area the
reader has to capture: a dimmed square frame, four corner brackets and a guide
line, with the crop inset kept proportional at any width.

## Example

```tsx
<CameraView active={streaming} label="Inquadra il codice">
  <video ref={video} autoPlay playsInline muted />
</CameraView>
```

## Behaviour

The frame is `aspect-square` at the width the caller sets in `--camera-size`,
capped at the space it receives. The crop and the line are decorative
(`aria-hidden`): the instruction is announced once through the `announcement`
function, which receives the label and the camera state and returns the whole
sentence, so the caller owns grammar and language. With no children the component
draws its own camera glyph in the centre, a runtime extension the source frame
does not contain; pass `children` (including `null`) to place the live preview or
to clear the centre. `active` only changes the announcement, because the source
draws no active or inactive paint.
